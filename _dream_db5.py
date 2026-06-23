import sqlite3, json

DB = "C:/Users/itope/.local/share/mimocode/mimocode.db"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

OTHER_SESSION = "ses_10b34805efferwgmntgohCe2ZG"

# Get full text of last user message (TypeScript error)
print("=== LAST USER MESSAGE (full) ===")
cur.execute("""SELECT substr(p.data, 1, 2000) as preview
               FROM part p 
               WHERE p.message_id = 'msg_ef4cd14c8001E4uN1AUQ8YGauN'
               ORDER BY p.time_created""",
            ())
for r in cur.fetchall():
    print(r['preview'])

# Get assistant response to the TypeScript error
print("\n=== ASSISTANT RESPONSE ===")
cur.execute("""SELECT json_extract(p.data, '$.type') as part_type,
               json_extract(p.data, '$.tool') as tool,
               substr(json_extract(p.data, '$.text'), 1, 1500) as text_preview,
               substr(json_extract(p.data, '$.state.output'), 1, 500) as output_preview,
               substr(json_extract(p.data, '$.state.input'), 1, 500) as input_preview
               FROM part p 
               WHERE p.message_id = 'msg_ef4cd15030012wCHWo7uXQyaYO'
               ORDER BY p.time_created""",
            ())
for r in cur.fetchall():
    print(f"  type={r['part_type']} tool={r['tool']}")
    if r['text_preview']:
        print(f"    text: {r['text_preview'][:500]}")
    if r['input_preview']:
        print(f"    input: {r['input_preview'][:300]}")
    if r['output_preview']:
        print(f"    output: {r['output_preview'][:300]}")
    print()

# Also check if there were any error patterns
print("\n=== CHECKING FOR COMMON PATTERNS ===")
cur.execute("""SELECT p.id, json_extract(p.data, '$.type') as part_type,
               json_extract(p.data, '$.tool') as tool,
               substr(p.data, 1, 2000) as full_data
               FROM part p 
               WHERE p.session_id = ?
               AND json_extract(p.data, '$.type') = 'tool'
               ORDER BY p.time_created""",
            (OTHER_SESSION,))
for r in cur.fetchall():
    tool = r['tool']
    full = r['full_data']
    if 'error' in full.lower() or 'Error' in full:
        print(f"  FOUND ERROR in part {r['id']}: {full[:300]}")

conn.close()
