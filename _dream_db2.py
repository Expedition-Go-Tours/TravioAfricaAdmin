import sqlite3, json

DB = "C:/Users/itope/.local/share/mimocode/mimocode.db"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

PROJECT = "30b0a7f7-81cb-4f4f-b322-5a0d12f6c9ef"
CURRENT_SESSION = "ses_10b347fc2ffezekqFx40AWmSaT"
OTHER_SESSION = "ses_10b34805efferwgmntgohCe2ZG"

# 1. Task table schema
cur.execute("PRAGMA table_info(task)")
print("=== TASK SCHEMA ===")
for r in cur.fetchall():
    print(f"  {r['name']} ({r['type']})")

# 2. Tasks for this project's sessions
print("\n=== TASKS FOR admin-dashboard SESSIONS ===")
cur.execute("SELECT * FROM task WHERE session_id IN (?, ?) ORDER BY time_created DESC", (CURRENT_SESSION, OTHER_SESSION))
for r in cur.fetchall():
    print(dict(r))

# 3. Task events for this project
print("\n=== TASK EVENTS ===")
cur.execute("""SELECT te.* FROM task_event te 
               JOIN task t ON te.task_id = t.id 
               WHERE t.session_id IN (?, ?) ORDER BY te.time_created DESC""",
            (CURRENT_SESSION, OTHER_SESSION))
for r in cur.fetchall():
    d = dict(r)
    if 'data' in d and d['data']:
        d['data'] = d['data'][:300]
    print(d)

# 4. Messages for the ESLint session
print(f"\n=== MESSAGES FOR {OTHER_SESSION} (title: Fixing ESLint errors) ===")
cur.execute("""SELECT m.id, json_extract(m.data, '$.role') as role, m.time_created, m.agent_id,
               substr(m.data, 1, 500) as preview
               FROM message m WHERE m.session_id = ? ORDER BY m.time_created""",
            (OTHER_SESSION,))
for r in cur.fetchall():
    print(f"  msg={r['id']} role={r['role']} agent={r['agent_id']} time={r['time_created']}")
    print(f"    {r['preview'][:200]}")
    print()

conn.close()
