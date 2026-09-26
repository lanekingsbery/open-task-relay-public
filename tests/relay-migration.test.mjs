import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('isolated synthetic backup restore rehearses only pending SQL and rejects repeat/unexpected ledgers',t=>{
  // Supplementary independent desktop SQLite check; D1/workerd below is mandatory.
  const capability=spawnSync('python3',['-c',String.raw`
import sys
try: import sqlite3
except ModuleNotFoundError as error:
    if error.name not in ('sqlite3','_sqlite3'): raise
    sys.exit(77)
`],{encoding:'utf8',timeout:10000});
  if(capability.status===77) {
    t.skip('Supplementary desktop rehearsal requires Python sqlite3; authoritative D1/workerd coverage still runs');
    return;
  }
  assert.equal(capability.status,0,capability.stderr || String(capability.error));
  const result=spawnSync('python3',['-c',String.raw`
import importlib.util,json,pathlib,sqlite3,tempfile
spec=importlib.util.spec_from_file_location('rehearsal','scripts/rehearse-relay-migration.py')
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
with tempfile.TemporaryDirectory() as directory:
    root=pathlib.Path(directory)
    db=sqlite3.connect(':memory:')
    db.executescript('CREATE TABLE __appgarden_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE,applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);')
    for path in sorted(pathlib.Path('drizzle').glob('*.sql')):
        if path.name==r.MIGRATION: continue
        db.executescript(path.read_text())
        db.execute('INSERT INTO __appgarden_migrations(name) VALUES (?)',(path.name,))
        db.commit()
    db.executescript("INSERT INTO agents(id,created_at,name,description,capabilities,interests,token_hash,last_seen) VALUES ('owner','2026-01-01','Synthetic','Fixture','[]','[]','synthetic-hash','2026-01-01');")
    expected_rows=sum(db.execute('SELECT COUNT(*) FROM '+name).fetchone()[0] for (name,) in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name!='__appgarden_migrations'").fetchall())
    backup=root/'backup.sql';backup.write_text('\n'.join(db.iterdump()))
    destination=root/'restore.sqlite'
    receipt=r.rehearse(backup,destination)
    assert receipt['existing_rows_unchanged']==expected_rows
    assert receipt['existing_tables_unchanged']==22
    assert receipt['new_empty_private_tables']==8
    assert receipt['failure_rollback']=='passed'
    assert receipt['legacy_ledger_entries_after']==13
    assert destination.stat().st_mode & 0o777 == 0o600
    try:r.rehearse(backup,destination)
    except FileExistsError:pass
    else:raise AssertionError('restore overwritten')
    restored=sqlite3.connect(destination)
    backup.write_text('\n'.join(restored.iterdump()));restored.close()
    try:r.rehearse(backup,root/'repeat.sqlite')
    except AssertionError:pass
    else:raise AssertionError('already applied migration accepted')
`],{encoding:'utf8',timeout:30000});
  assert.equal(result.status,0,result.stderr);
});

test('complete release batch passes D1 limits and rolls back the former eight-term count query', async () => {
  const {readFileSync} = await import('node:fs');
  const {Miniflare, convertV4MiniflareOptions} = await import('miniflare');
  const {rehearseRelayD1} = await import('../scripts/rehearse-relay-d1.mjs');
  const {APPLICATION_SCHEMA_SQL, buildRelayMigrationPlan, RELAY_TABLES} = await import('../scripts/relay-migration-plan.mjs');
  const expectedLedger = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8')).entries.map(x => x.tag + '.sql');
  const outbound = [];
  const mf = new Miniflare(convertV4MiniflareOptions({modules: true,
    script: 'export default {fetch(){return new Response("synthetic fixture")}}',
    compatibilityDate: '2026-09-07', d1Databases: ['DB'],
    outboundService: request => {outbound.push(request.url); throw new Error('Network forbidden');},
  }));
  try {
    // Synthetic state only: no private backup decoding or Python SQLite dependency.
    const db = await mf.getD1Database('DB');
    await db.prepare('CREATE TABLE __appgarden_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE,applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)').run();
    const applySql = async filename => {
      for (const sql of readFileSync('drizzle/' + filename, 'utf8').split('--> statement-breakpoint').filter(sql => sql.trim()))
        await db.prepare(sql).run();
    };
    for (const filename of expectedLedger.slice(0, -1)) {
      await applySql(filename);
      await db.prepare('INSERT INTO __appgarden_migrations(name) VALUES (?)').bind(filename).run();
    }
    await db.prepare("INSERT INTO agents(id,created_at,name,description,capabilities,interests,token_hash,last_seen) VALUES ('fixture','2026-01-01','Synthetic','Local only','[]','[]','synthetic-hash','2026-01-01')").run();
    const schema = (await db.prepare(APPLICATION_SCHEMA_SQL).all()).results;
    const rows = {};
    for (const table of schema.filter(x => x.type === 'table'))
      rows[table.name] = (await db.prepare(`SELECT * FROM "${table.name}"`).all()).results;
    // Obtain the reference schema by direct SQL, independently of the release-batch
    // builder. Operator real-backup rehearsals retain their desktop SQLite oracle.
    await applySql(expectedLedger.at(-1));
    const expectedSchemaAfter = (await db.prepare(APPLICATION_SCHEMA_SQL).all()).results;
    assert.equal(expectedSchemaAfter.filter(x => x.type === 'index' && x.name.startsWith('relay_')).length, 6);
    assert.equal(expectedSchemaAfter.filter(x => x.type === 'trigger' && x.name.startsWith('relay_')).length, 2);
    const baseline = {schema, rows, expectedSchemaAfter};
    const plan = buildRelayMigrationPlan({schema: baseline.schema,
      ledger: baseline.rows.__appgarden_migrations.map(x => x.name), expectedLedger,
      migrationSql: readFileSync('drizzle/0012_relay_private_state.sql', 'utf8')});
    const oldQueries = [...plan.queries];
    oldQueries.splice(plan.countsStart, RELAY_TABLES.length,
      plan.queries.slice(plan.countsStart, plan.countsEnd).join(' UNION ALL '));
    const receipt = await rehearseRelayD1(baseline, {failedQueries: oldQueries});
    assert.equal(receipt.baseline_tables, 23);
    assert.equal(receipt.migrated_tables, 31);
    assert.equal(receipt.application_rows_preserved, Object.entries(baseline.rows)
      .filter(([name]) => name !== '__appgarden_migrations').reduce((count, [, rows]) => count + rows.length, 0));
    assert.equal(receipt.ledger_before, 12);
    assert.equal(receipt.ledger_after, 13);
    assert.equal(receipt.all_application_hashes_preserved, true);
    assert.equal(receipt.exact_schema_matches, true);
    assert.equal(receipt.replay_refused, true);
    assert.equal(receipt.foreign_keys, 'passed');
    assert.equal(receipt.quick_check, 'ok');
    assert.equal(receipt.new_empty_relay_tables, 8);
    assert.equal(receipt.rollback, 'passed');
    assert.equal(receipt.outbound_requests, 0);
    assert.deepEqual(outbound, []);
  } finally { await mf.dispose(); }
});
