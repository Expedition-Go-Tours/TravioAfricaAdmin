import sqlite3, json, sys

DB = "C:/Users/itope/.local/share/mimocode/mimocode.db"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# 1. List tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
print("=== TABLES ===")
for r in cur.fetchall():
    print(r[0])

# 2. List all sessions (newest first)
print("\n=== SESSIONS ===")
cur.execute("SELECT id, project_id, directory, title, time_created FROM session ORDER BY time_created DESC")
for r in cur.fetchall():
    print(f"{r['id']} | proj={r['project_id']} | dir={r['directory']} | title={r['title']} | {r['time_created']}")

# 3. List tasks
print("\n=== TASKS ===")
cur.execute("SELECT id, session_id, title, status, time_created FROM task ORDER BY time_created DESC")
for r in cur.fetchall():
    print(f"{r['id']} | ses={r['session_id']} | title={r['title']} | status={r['status']} | {r['time_created']}")

conn.close()
