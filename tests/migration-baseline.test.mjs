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
