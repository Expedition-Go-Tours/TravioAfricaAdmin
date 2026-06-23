import sqlite3, json

DB = "C:/Users/itope/.local/share/mimocode/mimocode.db"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

PROJECT = "30b0a7f7-81cb-4f4f-b322-5a0d12f6c9ef"
CURRENT_SESSION = "ses_10b347fc2ffezekqFx40AWmSaT"
OTHER_SESSION = "ses_10b34805efferwgmntgohCe2ZG"

# 1. Tasks for this project's sessions
print("=== TASKS FOR admin-dashboard SESSIONS ===")
cur.execute("SELECT * FROM task WHERE session_id IN (?, ?) ORDER BY created_at DESC", (CURRENT_SESSION, OTHER_SESSION))
for r in cur.fetchall():
    d = dict(r)
    print(d)

# 2. Task events for this project
print("\n=== TASK EVENTS ===")
cur.execute("""SELECT te.* FROM task_event te 
               JOIN task t ON te.task_id = t.id 
               WHERE t.session_id IN (?, ?) ORDER BY te.created_at DESC""",
            (CURRENT_SESSION, OTHER_SESSION))
for r in cur.fetchall():
    d = dict(r)
    if 'data' in d and d['data']:
        d['data'] = d['data'][:500]
    print(d)

# 3. Messages for the ESLint session
print(f"\n=== MESSAGES FOR {OTHER_SESSION} ===")
cur.execute("""SELECT m.id, json_extract(m.data, '$.role') as role, m.time_created, m.agent_id
               FROM message m WHERE m.session_id = ? ORDER BY m.time_created""",
            (OTHER_SESSION,))
msgs = cur.fetchall()
for r in msgs:
    print(f"  msg={r['id']} role={r['role']} agent={r['agent_id']} time={r['time_created']}")

# 4. Parts for assistant messages in ESLint session
print(f"\n=== PARTS FOR ASSISTANT MESSAGES (ESLint session) ===")
cur.execute("""SELECT p.id, p.message_id, p.session_id,
               json_extract(p.data, '$.type') as part_type,
               json_extract(p.data, '$.tool') as tool,
               substr(p.data, 1, 600) as preview
               FROM part p 
               WHERE p.session_id = ?
               ORDER BY p.time_created""",
            (OTHER_SESSION,))
for r in cur.fetchall():
    print(f"  part={r['id']} msg={r['message_id']} type={r['part_type']} tool={r['tool']}")
    if r['preview']:
        print(f"    {r['preview'][:300]}")
    print()

# 5. Also check current session for messages
print(f"\n=== MESSAGES FOR {CURRENT_SESSION} (Auto Dream) ===")
cur.execute("""SELECT m.id, json_extract(m.data, '$.role') as role, m.time_created, m.agent_id
               FROM message m WHERE m.session_id = ? ORDER BY m.time_created""",
            (CURRENT_SESSION,))
for r in cur.fetchall():
    print(f"  msg={r['id']} role={r['role']} agent={r['agent_id']} time={r['time_created']}")

conn.close()
