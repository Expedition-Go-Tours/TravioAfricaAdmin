import sqlite3, json

DB = "C:/Users/itope/.local/share/mimocode/mimocode.db"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

OTHER_SESSION = "ses_10b34805efferwgmntgohCe2ZG"
CURRENT_SESSION = "ses_10b347fc2ffezekqFx40AWmSaT"

# Messages for ESLint session
print("=== MESSAGES FOR ESLint SESSION ===")
cur.execute("""SELECT m.id, json_extract(m.data, '$.role') as role, m.time_created, m.agent_id
               FROM message m WHERE m.session_id = ? ORDER BY m.time_created""",
            (OTHER_SESSION,))
msgs = cur.fetchall()
for r in msgs:
    print(f"  msg={r['id']} role={r['role']} agent={r['agent_id']} time={r['time_created']}")

# Parts for ESLint session (tool calls + text)
print("\n=== PARTS FOR ESLint SESSION ===")
cur.execute("""SELECT p.id, p.message_id,
               json_extract(p.data, '$.type') as part_type,
               json_extract(p.data, '$.tool') as tool,
               substr(json_extract(p.data, '$.text'), 1, 400) as text_preview,
               substr(json_extract(p.data, '$.state.output'), 1, 400) as output_preview,
               substr(json_extract(p.data, '$.state.input'), 1, 400) as input_preview
               FROM part p 
               WHERE p.session_id = ?
               ORDER BY p.time_created""",
            (OTHER_SESSION,))
for r in cur.fetchall():
    print(f"  part={r['id']} msg={r['message_id']} type={r['part_type']} tool={r['tool']}")
    if r['text_preview']:
        print(f"    text: {r['text_preview'][:200]}")
    if r['input_preview']:
        print(f"    input: {r['input_preview'][:200]}")
    if r['output_preview']:
        print(f"    output: {r['output_preview'][:200]}")
    print()

# Also check all sessions for this project
print("\n=== ALL PROJECT SESSIONS ===")
cur.execute("""SELECT id, title, time_created FROM session 
               WHERE project_id = '30b0a7f7-81cb-4f4f-b322-5a0d12f6c9ef' 
               ORDER BY time_created DESC""")
for r in cur.fetchall():
    print(f"  {r['id']} | {r['title']} | {r['time_created']}")

# Check task_event schema
print("\n=== TASK_EVENT SCHEMA ===")
cur.execute("PRAGMA table_info(task_event)")
for r in cur.fetchall():
    print(f"  {r['name']} ({r['type']})")

conn.close()
