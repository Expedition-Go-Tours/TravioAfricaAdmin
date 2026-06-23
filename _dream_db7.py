import sqlite3, json

DB = "C:/Users/itope/.local/share/mimocode/mimocode.db"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

PROJECT = "30b0a7f7-81cb-4f4f-b322-5a0d12f6c9ef"

# Get all sessions for this project, newest first
print("=== ALL SESSIONS FOR THIS PROJECT ===")
cur.execute("""SELECT id, title, time_created FROM session 
               WHERE project_id = ? ORDER BY time_created DESC""", (PROJECT,))
for r in cur.fetchall():
    print(f"  {r['id']} | {r['title']} | {r['time_created']}")

# Count messages per session
print("\n=== MESSAGE COUNTS ===")
cur.execute("""SELECT session_id, COUNT(*) as cnt FROM message 
               WHERE session_id IN (
                   SELECT id FROM session WHERE project_id = ?
               ) GROUP BY session_id""", (PROJECT,))
for r in cur.fetchall():
    print(f"  {r['session_id']}: {r['cnt']} messages")

# Get all unique file paths mentioned in tool calls for this project
print("\n=== FILES TOUCHED IN SESSIONS ===")
cur.execute("""SELECT DISTINCT 
               json_extract(p.data, '$.state.input') as input_path
               FROM part p 
               JOIN message m ON p.message_id = m.id
               WHERE m.session_id IN (
                   SELECT id FROM session WHERE project_id = ?
               )
               AND json_extract(p.data, '$.tool') IN ('read', 'edit', 'write')
               AND json_extract(p.data, '$.state.input') LIKE '%admin-dashboard%'""",
            (PROJECT,))
for r in cur.fetchall():
    if r['input_path']:
        # Extract the file path from the JSON
        try:
            inp = json.loads(r['input_path'])
            fp = inp.get('filePath', '')
            if fp:
                print(f"  {fp}")
        except:
            print(f"  {r['input_path'][:200]}")

conn.close()
