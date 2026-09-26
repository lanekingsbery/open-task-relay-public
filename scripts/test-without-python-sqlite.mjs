import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {delimiter, join} from 'node:path';

// Run the actual default application suite with a working Python interpreter
// whose SQLite imports fail exactly as in the Cloudflare build image.
const directory = mkdtempSync(join(tmpdir(), 'otr-python-no-sqlite-'));
try {
  for (const module of ['sqlite3', '_sqlite3'])
    writeFileSync(join(directory, module + '.py'), 'raise ModuleNotFoundError("No module named \'_sqlite3\'", name="_sqlite3")\n');
  const env = {...process.env,
    PYTHONPATH: [directory, process.env.PYTHONPATH].filter(Boolean).join(delimiter),
    NODE_OPTIONS: [process.env.NODE_OPTIONS, '--test-reporter=tap'].filter(Boolean).join(' '),
  };
  const probe = spawnSync('python3', ['-c', 'import sqlite3'], {env, encoding: 'utf8', timeout: 10000});
  assert.equal(probe.status, 1, probe.stderr || String(probe.error));
  assert.match(probe.stderr, /ModuleNotFoundError: No module named '_sqlite3'/);
  const result = spawnSync('npm', ['test'], {
    env, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024,
  });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  assert.equal(result.status, 0, String(result.error || 'Default suite failed without Python SQLite'));
  assert.match(result.stdout, /^ok \d+ - complete release batch passes D1 limits and rolls back the former eight-term count query\r?$/m);
  assert.match(result.stdout, /^ok \d+ - D1 engine serializes overlapping leases and rolls back a failing incident\/audit batch\r?$/m);
  assert.match(result.stdout, /^ok \d+ - isolated synthetic backup restore .* # SKIP Supplementary desktop rehearsal requires Python sqlite3/m);
  assert.match(result.stdout, /^# skipped 1\r?$/m);
  console.log('Default suite passed without Python SQLite; mandatory D1/workerd regressions executed.');
} finally {
  rmSync(directory, {recursive: true, force: true});
}
