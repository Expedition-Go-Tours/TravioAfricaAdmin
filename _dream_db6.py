import sqlite3, json

DB = "C:/Users/itope/.local/share/mimocode/mimocode.db"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

OTHER_SESSION = "ses_10b34805efferwgmntgohCe2ZG"

# Get the last assistant message's full text (the conclusion)
print("=== LAST ASSISTANT TEXT (full conclusion) ===")
cur.execute("""SELECT json_extract(p.data, '$.text') as text
               FROM part p 
               WHERE p.session_id = ?
               AND json_extract(p.data, '$.type') = 'text'
               ORDER BY p.time_created DESC LIMIT 1""",
            (OTHER_SESSION,))
for r in cur.fetchall():
    if r['text']:
        print(r['text'][:2000])

# Get all text parts to understand full narrative
print("\n\n=== ALL TEXT PARTS (assistant) ===")
cur.execute("""SELECT m.id as msg_id, p.id as part_id, 
               json_extract(p.data, '$.type') as part_type,
               substr(json_extract(p.data, '$.text'), 1, 500) as text,
               substr(json_extract(p.data, '$.tool'), 1, 50) as tool
               FROM part p 
               JOIN message m ON p.message_id = m.id
               WHERE p.session_id = ?
               AND json_extract(m.data, '$.role') = 'assistant'
               AND json_extract(p.data, '$.type') IN ('text', 'tool')
               ORDER BY m.time_created, p.time_created""",
            (OTHER_SESSION,))
for r in cur.fetchall():
    if r['text']:
        print(f"  [{r['part_type']} tool={r['tool']}] {r['text'][:300]}")
        print()

conn.close()
