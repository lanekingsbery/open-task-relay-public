import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, statSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {Miniflare, convertV4MiniflareOptions} from 'miniflare';
import {APPLICATION_SCHEMA_SQL, buildRelayMigrationPlan, RELAY_TABLES, serializeD1Batch} from './relay-migration-plan.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const sha = value => createHash('sha256').update(value).digest('hex');
const canonical = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
export const rowHash = rows => sha(rows.map(canonical).sort().join('\n'));

// SQLite only decodes the backup and supplies an independent expected schema.
// All release SQL and rollback checks below execute in workerd's local D1.
export function readBackup(backupPath) {
  const child = spawnSync('python3', ['-c', String.raw`
import json,sqlite3,sys
from pathlib import Path
c=sqlite3.connect(':memory:');c.row_factory=sqlite3.Row
c.executescript(Path(sys.argv[1]).read_text());c.execute('PRAGMA foreign_keys=ON')
assert c.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
assert not c.execute('PRAGMA foreign_key_check').fetchall()
q="SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' AND tbl_name NOT GLOB '_cf_*' ORDER BY type,name"
schema=[dict(x) for x in c.execute(q)]
rows={x['name']:[dict(row) for row in c.execute('SELECT * FROM "'+x['name'].replace('"','""')+'"')] for x in schema if x['type']=='table'}
c.executescript(Path(sys.argv[2]).read_text())
c.execute("INSERT INTO __appgarden_migrations(name) VALUES ('0012_relay_private_state.sql')")
print(json.dumps({'schema':schema,'rows':rows,'expectedSchemaAfter':[dict(x) for x in c.execute(q)]}))
`, backupPath, root + 'drizzle/0012_relay_private_state.sql'], {encoding: 'utf8', maxBuffer: 32 * 1024 * 1024});
  // Never forward child output on failure: it may contain private rows.
  assert.equal(child.status, 0, 'Backup decoding/reference validation failed');
  return JSON.parse(child.stdout);
}

export async function rehearseRelayD1(baseline, {failedQueries} = {}) {
  const migrationSql = readFileSync(root + 'drizzle/0012_relay_private_state.sql', 'utf8');
  const expectedLedger = JSON.parse(readFileSync(root + 'drizzle/meta/_journal.json', 'utf8')).entries.map(x => x.tag + '.sql');
  const ledger = [...baseline.rows.__appgarden_migrations].sort((a, b) => a.id - b.id).map(x => x.name);
  const plan = buildRelayMigrationPlan({schema: baseline.schema, ledger, migrationSql, expectedLedger});
  const outbound = [];
  const mf = new Miniflare(convertV4MiniflareOptions({modules: true,
    script: 'export default {fetch(){return new Response("isolated migration rehearsal")}}',
    compatibilityDate: '2026-09-07', d1Databases: ['DB'],
    outboundService: request => {outbound.push(request.url); throw new Error('Network forbidden');},
  }));
  try {
    const db = await mf.getD1Database('DB');
    const restore = ['PRAGMA defer_foreign_keys=ON', ...baseline.schema.filter(x => x.type === 'table').map(x => x.sql)]
      .map(sql => db.prepare(sql));
    for (const [table, rows] of Object.entries(baseline.rows)) {
      for (const row of rows) {
        const columns = Object.keys(row);
        restore.push(db.prepare(`INSERT INTO "${table}" (${columns.map(x => `"${x}"`).join(',')}) VALUES (${columns.map(() => '?').join(',')})`)
          .bind(...Object.values(row)));
      }
    }
    restore.push(...baseline.schema.filter(x => x.type !== 'table').map(x => db.prepare(x.sql)));
    await db.batch(restore);
    const snapshot = async () => ({schema: (await db.prepare(APPLICATION_SCHEMA_SQL).all()).results,
      hashes: Object.fromEntries(await Promise.all(Object.keys(baseline.rows).sort().map(async table =>
        [table, rowHash((await db.prepare(`SELECT * FROM "${table}"`).all()).results)])))});
    const before = await snapshot();
    assert.deepEqual(before.schema, baseline.schema);
    for (const [table, rows] of Object.entries(baseline.rows)) assert.equal(before.hashes[table], rowHash(rows));
    assert.equal((await db.prepare('PRAGMA foreign_key_check').all()).results.length, 0);
    assert.deepEqual((await db.prepare('PRAGMA quick_check').all()).results, [{quick_check: 'ok'}]);
    const run = queries => db.batch(queries.map(sql => db.prepare(sql)));
    if (failedQueries) {
      await assert.rejects(run(failedQueries), /too many terms in compound SELECT/);
      assert.deepEqual(await snapshot(), before, 'Failed original batch must roll back');
    }
    await assert.rejects(run([...plan.queries, 'SELECT * FROM deliberate_missing_relay_table']), /no such table/);
    assert.deepEqual(await snapshot(), before, 'Late failure must roll back DDL, rows and ledger');
    const result = await run(plan.queries);
    assert.deepEqual(result[plan.afterSchemaIndex].results, baseline.expectedSchemaAfter);
    let rows = 0;
    for (let i = 0; i < plan.applicationTables.length; i++) {
      const original = result[plan.beforeStart + i].results;
      assert.equal(rowHash(original), rowHash(result[plan.afterStart + i].results));
      rows += original.length;
    }
    assert.deepEqual(result[plan.ledgerIndex].results.map(x => x.name), expectedLedger);
    assert.deepEqual(result.slice(plan.countsStart, plan.countsEnd).flatMap(x => x.results), RELAY_TABLES.map(name => ({name, n: 0})));
    assert.deepEqual(result.at(-2).results, []);
    assert.deepEqual(result.at(-1).results, [{quick_check: 'ok'}]);
    const after = await snapshot();
    for (const table of plan.applicationTables) assert.equal(after.hashes[table], before.hashes[table]);
    const ledgerAfter = (await db.prepare('SELECT * FROM __appgarden_migrations ORDER BY id').all()).results;
    assert.equal(rowHash(ledgerAfter.slice(0, -1)), before.hashes.__appgarden_migrations);
    await assert.rejects(run(plan.queries), /malformed JSON/);
    assert.deepEqual(await snapshot(), after, 'Replay refusal must preserve migrated state');
    assert.deepEqual(outbound, []);
    return {migration_sha256: sha(migrationSql),sql_payload_sha256: sha(serializeD1Batch(plan.queries)),
      statements: plan.queries.length, baseline_tables: Object.keys(baseline.rows).length,
      migrated_tables: baseline.expectedSchemaAfter.filter(x => x.type === 'table').length,
      application_rows_preserved: rows, all_application_hashes_preserved: true, exact_schema_matches: true,
      ledger_before: ledger.length, ledger_after: expectedLedger.length, new_empty_relay_tables: RELAY_TABLES.length,
      rollback: 'passed', replay_refused: true, foreign_keys: 'passed', quick_check: 'ok', outbound_requests: 0};
  } finally { await mf.dispose(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.umask(0o077);
  const [backupPath, expectedHash] = process.argv.slice(2);
  assert(backupPath && /^[a-f0-9]{64}$/.test(expectedHash ?? ''), 'Usage: node scripts/rehearse-relay-d1.mjs PRIVATE_BACKUP_SQL EXPECTED_SHA256');
  assert.equal(statSync(backupPath).mode & 0o777, 0o600, 'Backup must be private');
  const bytes = readFileSync(backupPath); assert.equal(sha(bytes), expectedHash, 'Backup checksum mismatch');
  const receipt = await rehearseRelayD1(readBackup(backupPath));
  assert.equal(sha(readFileSync(backupPath)), expectedHash, 'Backup changed');
  console.log(JSON.stringify({backup_sha256: expectedHash, ...receipt}, null, 2));
}
