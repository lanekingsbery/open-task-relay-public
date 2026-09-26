import assert from 'node:assert/strict';

export const RELAY_MIGRATION = '0012_relay_private_state.sql';
export const RELAY_TABLES = Object.freeze([
  'relay_actions', 'relay_approvals', 'relay_budget', 'relay_check_state',
  'relay_incidents', 'relay_leases', 'relay_observations', 'relay_runs',
]);
export const APPLICATION_SCHEMA_SQL = "SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' AND tbl_name NOT GLOB '_cf_*' ORDER BY type,name";
const literal = value => "'" + JSON.stringify(value).replaceAll("'", "''") + "'";
export const serializeD1Batch = queries => queries.map(sql => sql.trim().replace(/;\s*$/, '') + ';').join('\n');

// Pure SQL builder: no credentials, remote execution, migration discovery or writes.
// Rehearse this entire plan under local D1, not just the migration file under SQLite.
export function buildRelayMigrationPlan({schema, ledger, migrationSql, expectedLedger}) {
  assert.equal(expectedLedger.at(-1), RELAY_MIGRATION);
  assert.deepEqual(ledger, expectedLedger.slice(0, -1), 'Unexpected pending migration');
  const tables = schema.filter(row => row.type === 'table').map(row => row.name).sort();
  assert(tables.includes('__appgarden_migrations'));
  assert(tables.every(name => /^[a-z_]+$/.test(name) && !name.startsWith('relay_')));
  const applicationTables = tables.filter(name => name !== '__appgarden_migrations');
  const migration = migrationSql.split('--> statement-breakpoint').map(sql => sql.trim()).filter(Boolean);
  for (const sql of migration) {
    assert.match(sql.replace(/--[^\n]*/g, '').trim(), /^CREATE (?:TABLE|(?:UNIQUE )?INDEX|TRIGGER) [`"]?relay_/,
      'Only the reviewed additive Relay migration belongs in this batch');
  }
  const ledgerGuard = `SELECT CASE WHEN (SELECT json_group_array(name) FROM (SELECT name FROM __appgarden_migrations ORDER BY id))=${literal(ledger)} THEN 1 ELSE json('INVALID_RELEASE_LEDGER') END AS ledger_guard`;
  const schemaGuard = `SELECT CASE WHEN (SELECT json_group_array(json_object('type',type,'name',name,'tbl_name',tbl_name,'sql',sql)) FROM (${APPLICATION_SCHEMA_SQL}))=${literal(schema)} THEN 1 ELSE json('INVALID_RELEASE_SCHEMA') END AS schema_guard`;
  const queries = [ledgerGuard, schemaGuard, APPLICATION_SCHEMA_SQL];
  const beforeStart = queries.length;
  queries.push(...applicationTables.map(name => `SELECT * FROM "${name}"`), ...migration,
    `INSERT INTO __appgarden_migrations(name) VALUES ('${RELAY_MIGRATION}')`);
  const afterSchemaIndex = queries.length;
  queries.push(APPLICATION_SCHEMA_SQL);
  const afterStart = queries.length;
  queries.push(...applicationTables.map(name => `SELECT * FROM "${name}"`));
  const ledgerIndex = queries.length;
  queries.push('SELECT name FROM __appgarden_migrations ORDER BY id');
  const countsStart = queries.length;
  // workerd limits a compound SELECT to five terms. Keep these independent,
  // while retaining every count in the same atomic D1 batch as the migration.
  queries.push(...RELAY_TABLES.map(name => `SELECT '${name}' AS name,COUNT(*) AS n FROM ${name}`),
    'PRAGMA foreign_key_check', 'PRAGMA quick_check');
  return {queries, applicationTables, beforeStart, afterStart, afterSchemaIndex, ledgerIndex,
    countsStart, countsEnd: countsStart + RELAY_TABLES.length, expectedLedger};
}
