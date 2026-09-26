"""Restore a private SQL backup locally and rehearse only 0012. Never connects to a service.
Usage: python3 scripts/rehearse-relay-migration.py PRIVATE_BACKUP_SQL NEW_LOCAL_SQLITE
Outputs aggregate checks only. Keep the restore outside Git/public assets with mode 0600.
"""
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import sys

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = '0012_relay_private_state.sql'


def snapshot(db, tables):
    # Hash rows in deterministic order; never log private records.
    result = {}
    for table in tables:
        name = '"' + table.replace('"', '""') + '"'
        rows = sorted(json.dumps(row, separators=(',', ':')) for row in db.execute('SELECT * FROM ' + name))
        result[table] = (len(rows), hashlib.sha256('\n'.join(rows).encode()).hexdigest())
    return result


def rehearse(backup, destination):
    sql = (ROOT / 'drizzle' / MIGRATION).read_text()
    fd = os.open(destination, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.close(fd)
    db = sqlite3.connect(destination)
    try:
        db.executescript(Path(backup).read_text())
        db.execute('PRAGMA foreign_keys=ON')
        assert not db.execute('PRAGMA foreign_key_check').fetchall(), 'RESTORE_FOREIGN_KEYS'
        tables = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
        ledger = [r[0] for r in db.execute('SELECT name FROM __appgarden_migrations ORDER BY id')]
        journal = json.loads((ROOT / 'drizzle/meta/_journal.json').read_text())['entries']
        expected = [e['tag'] + '.sql' for e in journal]
        assert ledger == expected[:-1] and expected[-1] == MIGRATION, 'UNEXPECTED_PENDING_SQL'
        before = snapshot(db, tables)
        schema_before = db.execute("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").fetchall()
        # Fault rehearsal: a later failure rolls back both DDL and legacy-ledger insertion.
        try:
            db.executescript("BEGIN;\n" + sql + "\nINSERT INTO __appgarden_migrations(name) VALUES ('" + MIGRATION + "');\nSELECT * FROM deliberate_missing_relay_table;\nCOMMIT;")
        except sqlite3.OperationalError:
            db.rollback()
        assert db.execute("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").fetchall() == schema_before
        assert snapshot(db, tables) == before
        db.executescript("BEGIN;\n" + sql + "\nINSERT INTO __appgarden_migrations(name) VALUES ('" + MIGRATION + "');\nCOMMIT;")
        for kind, name, definition in schema_before:
            assert db.execute('SELECT sql FROM sqlite_master WHERE type=? AND name=?', (kind, name)).fetchone() == (definition,), 'EXISTING_SCHEMA_CHANGED'
        unchanged = [t for t in tables if t != '__appgarden_migrations']
        assert snapshot(db, unchanged) == {t: before[t] for t in unchanged}, 'EXISTING_ROWS_CHANGED'
        assert db.execute('SELECT name FROM __appgarden_migrations ORDER BY id').fetchall() == [(v,) for v in expected]
        assert not db.execute('PRAGMA foreign_key_check').fetchall(), 'MIGRATION_FOREIGN_KEYS'
        assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        relay = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'relay_%'")]
        assert len(relay) == 8 and all(db.execute('SELECT COUNT(*) FROM ' + t).fetchone()[0] == 0 for t in relay)
        return {'backup_sha256': hashlib.sha256(Path(backup).read_bytes()).hexdigest(),
                'migration_sha256': hashlib.sha256(sql.encode()).hexdigest(), 'pending_sql': [MIGRATION],
                'existing_tables_unchanged': len(unchanged), 'existing_rows_unchanged': sum(before[t][0] for t in unchanged),
                'new_empty_private_tables': len(relay), 'legacy_ledger_entries_before': len(ledger),
                'legacy_ledger_entries_after': len(expected), 'failure_rollback': 'passed',
                'foreign_key_check': 'passed', 'integrity_check': 'ok', 'production_sql_applied': False}
    finally:
        db.close()


if __name__ == '__main__':
    print(json.dumps(rehearse(sys.argv[1], sys.argv[2]), indent=2))
