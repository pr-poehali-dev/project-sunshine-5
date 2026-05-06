import json
import os
import pg8000.dbapi

SCHEMA = "t_p43524458_project_sunshine_5"

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_conn():
    dsn = os.environ["DATABASE_URL"]
    from urllib.parse import urlparse
    u = urlparse(dsn)
    conn = pg8000.dbapi.connect(
        user=u.username,
        password=u.password,
        host=u.hostname,
        port=u.port or 5432,
        database=u.path.lstrip("/"),
    )
    conn.autocommit = True
    return conn


def escape(s: str) -> str:
    return s.replace("'", "''")


def handler(event: dict, context) -> dict:
    """Сообщения: получение, создание (с поддержкой тредов), лайки."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    method = event.get("httpMethod")
    conn = get_conn()
    cur = conn.cursor()

    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        content = (body.get("content") or "").strip()
        category = (body.get("category") or "general").strip()
        parent_id = body.get("parent_id")

        if not content or len(content) < 5:
            conn.close()
            return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": "Сообщение слишком короткое"})}

        if len(content) > 2000:
            conn.close()
            return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": "Сообщение слишком длинное (макс. 2000 символов)"})}

        if parent_id:
            sql = f"INSERT INTO {SCHEMA}.messages (content, category, parent_id) VALUES ('{escape(content)}', '{escape(category)}', {int(parent_id)}) RETURNING id, created_at"
        else:
            sql = f"INSERT INTO {SCHEMA}.messages (content, category) VALUES ('{escape(content)}', '{escape(category)}') RETURNING id, created_at"

        cur.execute(sql)
        row = cur.fetchone()
        conn.close()
        return {"statusCode": 201, "headers": CORS_HEADERS, "body": json.dumps({"id": row[0], "created_at": str(row[1])})}

    if method == "GET":
        params = event.get("queryStringParameters") or {}
        thread_id = params.get("thread_id")

        if thread_id:
            cur.execute(
                f"SELECT id, content, category, created_at, likes, parent_id FROM {SCHEMA}.messages WHERE (id = {int(thread_id)} OR parent_id = {int(thread_id)}) AND is_hidden = FALSE ORDER BY created_at ASC"
            )
            rows = cur.fetchall()
            conn.close()
            messages = [{"id": r[0], "content": r[1], "category": r[2], "created_at": str(r[3]), "likes": r[4] or 0, "parent_id": r[5]} for r in rows]
        else:
            cur.execute(
                f"SELECT id, content, category, created_at, likes, parent_id FROM {SCHEMA}.messages WHERE parent_id IS NULL AND is_hidden = FALSE ORDER BY created_at DESC LIMIT 100"
            )
            rows = cur.fetchall()
            ids = [str(r[0]) for r in rows]
            reply_counts = {}
            if ids:
                cur.execute(f"SELECT parent_id, COUNT(*) FROM {SCHEMA}.messages WHERE parent_id IN ({','.join(ids)}) AND is_hidden = FALSE GROUP BY parent_id")
                for rc in cur.fetchall():
                    reply_counts[rc[0]] = rc[1]
            conn.close()
            messages = [{"id": r[0], "content": r[1], "category": r[2], "created_at": str(r[3]), "likes": r[4] or 0, "parent_id": r[5], "reply_count": reply_counts.get(r[0], 0)} for r in rows]

        return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps({"messages": messages})}

    if method == "PUT":
        body = json.loads(event.get("body") or "{}")
        msg_id = int(body.get("id") or 0)
        if not msg_id:
            conn.close()
            return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": "id required"})}

        cur.execute(f"UPDATE {SCHEMA}.messages SET likes = likes + 1 WHERE id = {msg_id} AND is_hidden = FALSE RETURNING likes")
        row = cur.fetchone()
        conn.close()

        if not row:
            return {"statusCode": 404, "headers": CORS_HEADERS, "body": json.dumps({"error": "not found"})}

        return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps({"likes": row[0]})}

    conn.close()
    return {"statusCode": 405, "headers": CORS_HEADERS, "body": json.dumps({"error": "Method not allowed"})}
