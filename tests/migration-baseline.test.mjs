import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrations = join(root, 'drizzle');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

function migrationFiles(directory) {
  return Object.fromEntries(readdirSync(directory, {recursive: true})
    .filter((path) => /\.(sql|json)$/.test(path)).sort()
    .map((path) => [path, readFileSync(join(directory, path), 'utf8')]));
}

test('review completeness snapshot links to 0008 and changes only the existing column', () => {
  const previous = readJson(join(migrations, 'meta/0008_snapshot.json'));
  const current = readJson(join(migrations, 'meta/0009_snapshot.json'));
  assert.notEqual(current.id, previous.id);
  assert.equal(current.prevId, previous.id);
  assert.deepEqual(current.tables.verifications.columns.completeness, {
    name: 'completeness', type: 'text', primaryKey: false, notNull: true,
    autoincrement: false, default: "'unknown'",
  });
  delete current.tables.verifications.columns.completeness;
  current.id = previous.id;
  current.prevId = previous.prevId;
  assert.deepEqual(current, previous);
});

test('Drizzle validates history and generates no migration from the current schema', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'otr-migration-baseline-'));
  try {
    // Use only source/config and a disposable copy of migration metadata. No DB binding.
    for (const path of ['drizzle', 'db', 'drizzle.config.ts']) {
      cpSync(join(root, path), join(temporary, path), {recursive: true});
    }
    symlinkSync(join(root, 'node_modules'), join(temporary, 'node_modules'), 'dir');
    const before = migrationFiles(join(temporary, 'drizzle'));
    for (const command of ['check', 'generate']) {
      const result = spawnSync(process.execPath,
        [join(root, 'node_modules/drizzle-kit/bin.cjs'), command, '--config=drizzle.config.ts'],
        {cwd: temporary, encoding: 'utf8', timeout: 30_000});
      assert.ifError(result.error);
      const output = result.stdout + result.stderr;
      assert.equal(result.status, 0, output);
      if (command === 'generate') assert.match(output, /No schema changes, nothing to migrate/);
    }
    assert.deepEqual(migrationFiles(join(temporary, 'drizzle')), before,
      'Generation must not add SQL/snapshots or change the journal');
  } finally {
    rmSync(temporary, {recursive: true, force: true});
  }
});

test('ordered SQL history creates the snapshot completeness column with its SQL constraint', () => {
  const database = new DatabaseSync(':memory:');
  try {
    database.exec('PRAGMA foreign_keys=ON');
    const journal = readJson(join(migrations, 'meta/_journal.json'));
    for (const {tag} of journal.entries) {
      database.exec(readFileSync(join(migrations, `${tag}.sql`), 'utf8'));
    }
    const columns = database.prepare("PRAGMA table_info('verifications')").all();
    const completeness = columns.filter((column) => column.name === 'completeness');
    assert.equal(completeness.length, 1);
    assert.equal(completeness[0].type.toLowerCase(), 'text');
    assert.equal(completeness[0].notnull, 1);
    assert.equal(completeness[0].dflt_value, "'unknown'");
    const {sql} = database.prepare("SELECT sql FROM sqlite_schema WHERE name='verifications'").get();
    assert.match(sql, /CHECK\s*\(completeness IN \('unknown','partial','complete'\)\)/);
    assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(), []);
  } finally {
    database.close();
  }
});

test('agent moderation upgrade preserves existing records and defaults to visible/unrestricted',()=>{
 const database=new DatabaseSync(':memory:');
 try{
  database.exec('PRAGMA foreign_keys=ON');
  for(const {tag} of readJson(join(migrations,'meta/_journal.json')).entries.filter(e=>e.idx<10))database.exec(readFileSync(join(migrations,`${tag}.sql`),'utf8'));
  database.exec("INSERT INTO agents(id,created_at,name,description,capabilities,interests,token_hash,last_seen) VALUES ('fixture-agent','2026-01-01','Fixture','Local only','[]','[]','synthetic-hash','2026-01-01'); INSERT INTO rooms(id,created_at,creator,name,description) VALUES ('fixture-room','2026-01-01','fixture-agent','Fixture','Local only'); INSERT INTO messages(id,created_at,author,room_id,content,evidence) VALUES ('fixture-message','2026-01-01','fixture-agent','fixture-room','Original fixture content','[]');");
  const before=database.prepare('SELECT * FROM messages').all();
  database.exec(readFileSync(join(migrations,'0010_agent_moderation.sql'),'utf8'));
  assert.deepEqual(database.prepare('SELECT * FROM messages').all().map(m=>({...m})),before.map(m=>({...m,hidden:0})));
  assert.equal(database.prepare("SELECT posting_restricted FROM agents WHERE id='fixture-agent'").get().posting_restricted,0);
  assert.equal(database.prepare('SELECT count(*) n FROM agent_moderation').get().n,0);
  assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{database.close();}
});


test('owner verification upgrade preserves accepted records and creates an empty auditable state',()=>{
 const database=new DatabaseSync(':memory:');
 try{
  database.exec('PRAGMA foreign_keys=ON');
  for(const {tag} of readJson(join(migrations,'meta/_journal.json')).entries.filter(e=>e.idx<11))database.exec(readFileSync(join(migrations,`${tag}.sql`),'utf8'));
  database.exec(`INSERT INTO agents(id,created_at,name,description,capabilities,interests,token_hash,last_seen) VALUES ('owner','2026-01-01','Fixture','Local only','[]','[]','synthetic-hash','2026-01-01');
   INSERT INTO tasks(id,created_at,updated_at,creator,title,description,required_capabilities,status,accepted_result_id) VALUES ('task','2026-01-01','2026-01-01','owner','Fixture','Accepted fixture','[]','completed','result');
   INSERT INTO results(id,created_at,task_id,author,content,evidence) VALUES ('result','2026-01-01','task','owner','Immutable accepted result','[]');
   INSERT INTO verifications(id,created_at,result_id,author,verdict,content,evidence,confidence) VALUES ('review','2026-01-01','result','owner','agree','Historical review','[]',1);
   INSERT INTO acceptance_snapshots(result_id,task_id,created_at,revision,protocol) VALUES ('result','task','2026-01-01',1,'{}');`);
  const tables=['tasks','results','verifications','acceptance_snapshots'];
  const before=tables.map(t=>database.prepare('SELECT * FROM '+t).all());
  database.exec(readFileSync(join(migrations,'0011_owner_verifications.sql'),'utf8'));
  assert.deepEqual(tables.map(t=>database.prepare('SELECT * FROM '+t).all()),before);
  assert.equal(database.prepare('SELECT count(*) n FROM owner_verifications').get().n,0);
  assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{database.close();}
});
