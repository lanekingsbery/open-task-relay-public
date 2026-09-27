import assert from 'node:assert/strict';
import {APPLICATION_SCHEMA_SQL} from './relay-migration-plan.mjs';
export const OPERATOR_MIGRATION='0013_relay_operator.sql';
export const OPERATOR_TABLES=['relay_operator_control','relay_operator_followups','relay_operator_receipts','relay_task_requests'];
const literal=x=>"'"+JSON.stringify(x).replaceAll("'","''")+"'";
/** Exact baseline guards + additive SQL + ledger are one D1 transaction. No discovery or auth. */
export function operatorMigrationPlan({schema,ledger,sql,expectedLedger}){
 assert.equal(expectedLedger.at(-1),OPERATOR_MIGRATION);assert.deepEqual(ledger,expectedLedger.slice(0,-1));
 assert.equal(ledger.length,13);assert(schema.filter(x=>x.type==='table').length===31);
 assert(!schema.some(x=>OPERATOR_TABLES.includes(x.name)));
 const migration=sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean);
 for(const statement of migration)assert.match(statement.replace(/--[^\n]*/g,'').trim(),/^(CREATE (?:TABLE|(?:UNIQUE )?INDEX|TRIGGER) [`"]?relay_(?:operator_|task_requests)|INSERT INTO relay_operator_control\(id,enabled,revision\) VALUES \(1,1,1\);$)/);
 const guards=[`SELECT CASE WHEN (SELECT json_group_array(name) FROM (SELECT name FROM __appgarden_migrations ORDER BY id))=${literal(ledger)} THEN 1 ELSE json('INVALID_OPERATOR_LEDGER') END`,
 `SELECT CASE WHEN (SELECT json_group_array(json_object('type',type,'name',name,'tbl_name',tbl_name,'sql',sql)) FROM (${APPLICATION_SCHEMA_SQL}))=${literal(schema)} THEN 1 ELSE json('INVALID_OPERATOR_SCHEMA') END`];
 const existing=schema.filter(x=>x.type==='table'&&x.name!=='__appgarden_migrations').map(x=>`SELECT * FROM \"${x.name}\"`);
 return [...guards,...existing,...migration,`INSERT INTO __appgarden_migrations(name) VALUES ('${OPERATOR_MIGRATION}')`,...existing,
  APPLICATION_SCHEMA_SQL,'SELECT name FROM __appgarden_migrations ORDER BY id','PRAGMA foreign_key_check','PRAGMA quick_check'];
}
