import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('isolated synthetic backup restore rehearses only pending SQL and rejects repeat/unexpected ledgers',()=>{
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
  const {mkdtempSync, writeFileSync, rmSync} = await import('node:fs');
  const {tmpdir} = await import('node:os');
  const {join} = await import('node:path');
  const {readBackup, rehearseRelayD1} = await import('../scripts/rehearse-relay-d1.mjs');
  const {buildRelayMigrationPlan, RELAY_TABLES} = await import('../scripts/relay-migration-plan.mjs');
  const {readFileSync} = await import('node:fs');
  const directory = mkdtempSync(join(tmpdir(), 'otr-relay-d1-regression-'));
  try {
    const fixture = spawnSync('python3', ['-c', String.raw`
import json,pathlib,sqlite3
c=sqlite3.connect(':memory:')
c.execute('CREATE TABLE __appgarden_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE,applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)')
for entry in json.loads(pathlib.Path('drizzle/meta/_journal.json').read_text())['entries'][:-1]:
    c.executescript(pathlib.Path('drizzle',entry['tag']+'.sql').read_text())
    c.execute('INSERT INTO __appgarden_migrations(name) VALUES (?)',(entry['tag']+'.sql',));c.commit()
c.execute("INSERT INTO agents(id,created_at,name,description,capabilities,interests,token_hash,last_seen) VALUES ('fixture','2026-01-01','Synthetic','Local only','[]','[]','synthetic-hash','2026-01-01')");c.commit()
print('\n'.join(c.iterdump()))
`], {encoding: 'utf8'});
    assert.equal(fixture.status, 0, fixture.stderr);
    const backup = join(directory, 'synthetic.sql');
    writeFileSync(backup, fixture.stdout, {mode: 0o600});
    const baseline = readBackup(backup);
    const expectedLedger = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8')).entries.map(x => x.tag + '.sql');
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
    assert.equal(receipt.ledger_after, 13);
    assert.equal(receipt.new_empty_relay_tables, 8);
    assert.equal(receipt.rollback, 'passed');
    assert.equal(receipt.outbound_requests, 0);
  } finally { rmSync(directory, {recursive: true, force: true}); }
});
