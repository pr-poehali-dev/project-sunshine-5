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
    """Сохранение и получение анонимных сообщений."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    method = event.get("httpMethod")
    conn = get_conn()
    cur = conn.cursor()

    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        content = (body.get("content") or "").strip()
        category = (body.get("category") or "general").strip()

        if not content or len(content) < 5:
            conn.close()
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"error": "Сообщение слишком короткое"}),
            }

        if len(content) > 2000:
            conn.close()
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"error": "Сообщение слишком длинное (макс. 2000 символов)"}),
            }

        sql = f"INSERT INTO {SCHEMA}.messages (content, category) VALUES ('{escape(content)}', '{escape(category)}') RETURNING id, created_at"
        cur.execute(sql)
        row = cur.fetchone()
        conn.close()

        return {
            "statusCode": 201,
            "headers": CORS_HEADERS,
            "body": json.dumps({"id": row[0], "created_at": str(row[1])}),
        }

    if method == "GET":
        cur.execute(
            f"SELECT id, content, category, created_at, likes FROM {SCHEMA}.messages ORDER BY created_at DESC LIMIT 50"
        )
        rows = cur.fetchall()
        conn.close()

        messages = [
            {"id": r[0], "content": r[1], "category": r[2], "created_at": str(r[3]), "likes": r[4] or 0}
            for r in rows
        ]
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({"messages": messages}),
        }

    if method == "PUT":
        body = json.loads(event.get("body") or "{}")
        msg_id = int(body.get("id") or 0)
        if not msg_id:
            conn.close()
            return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": "id required"})}

        cur.execute(
            f"UPDATE {SCHEMA}.messages SET likes = likes + 1 WHERE id = {msg_id} RETURNING likes"
        )
        row = cur.fetchone()
        conn.close()

        if not row:
            return {"statusCode": 404, "headers": CORS_HEADERS, "body": json.dumps({"error": "not found"})}

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({"likes": row[0]}),
        }

    conn.close()
    return {"statusCode": 405, "headers": CORS_HEADERS, "body": json.dumps({"error": "Method not allowed"})}