import json
import os
import hmac
import hashlib
import time
import base64
import pg8000.dbapi

SCHEMA = "t_p43524458_project_sunshine_5"

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Mod-Token",
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


def hash_password(password: str) -> str:
    secret = os.environ.get("MOD_SECRET", "fallback")
    return hmac.new(secret.encode(), password.encode(), hashlib.sha256).hexdigest()


def make_token(username: str) -> str:
    secret = os.environ.get("MOD_SECRET", "fallback")
    payload = f"{username}:{int(time.time()) + 86400 * 30}"
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    token = base64.b64encode(f"{payload}:{sig}".encode()).decode()
    return token


def verify_token(token: str) -> str | None:
    secret = os.environ.get("MOD_SECRET", "fallback")
    try:
        decoded = base64.b64decode(token.encode()).decode()
        parts = decoded.rsplit(":", 1)
        if len(parts) != 2:
            return None
        payload, sig = parts
        expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        username, exp = payload.rsplit(":", 1)
        if int(exp) < int(time.time()):
            return None
        return username
    except Exception:
        return None


def handler(event: dict, context) -> dict:
    """Модератор: логин, управление постами. Поле action в теле/query: login|register|me|posts|hide."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    method = event.get("httpMethod")
    headers_raw = event.get("headers") or {}
    mod_token = headers_raw.get("x-mod-token") or headers_raw.get("X-Mod-Token") or ""
    params = event.get("queryStringParameters") or {}

    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    action = body.get("action") or params.get("action") or ""

    conn = get_conn()
    cur = conn.cursor()

    # login
    if method == "POST" and action == "login":
        username = (body.get("username") or "").strip()
        password = (body.get("password") or "").strip()

        if not username or not password:
            conn.close()
            return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": "Заполни все поля"})}

        pw_hash = hash_password(password)
        cur.execute(f"SELECT id, username FROM {SCHEMA}.moderators WHERE username = '{escape(username)}' AND password_hash = '{pw_hash}'")
        row = cur.fetchone()
        conn.close()

        if not row:
            return {"statusCode": 401, "headers": CORS_HEADERS, "body": json.dumps({"error": "Неверный логин или пароль"})}

        token = make_token(username)
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps({"token": token, "username": username})}

    # register — только если нет ни одного модератора
    if method == "POST" and action == "register":
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.moderators")
        count = cur.fetchone()[0]
        if count > 0:
            conn.close()
            return {"statusCode": 403, "headers": CORS_HEADERS, "body": json.dumps({"error": "Регистрация закрыта"})}

        username = (body.get("username") or "").strip()
        password = (body.get("password") or "").strip()

        if not username or len(password) < 6:
            conn.close()
            return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": "Логин обязателен, пароль минимум 6 символов"})}

        pw_hash = hash_password(password)
        cur.execute(f"INSERT INTO {SCHEMA}.moderators (username, password_hash) VALUES ('{escape(username)}', '{pw_hash}')")
        conn.close()
        token = make_token(username)
        return {"statusCode": 201, "headers": CORS_HEADERS, "body": json.dumps({"token": token, "username": username})}

    # me — проверка токена
    if method == "GET" and action == "me":
        username = verify_token(mod_token)
        conn.close()
        if not username:
            return {"statusCode": 401, "headers": CORS_HEADERS, "body": json.dumps({"error": "Unauthorized"})}
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps({"username": username})}

    # posts — все посты для модератора
    if method == "GET" and action == "posts":
        username = verify_token(mod_token)
        if not username:
            conn.close()
            return {"statusCode": 401, "headers": CORS_HEADERS, "body": json.dumps({"error": "Unauthorized"})}

        category = params.get("category")
        show_hidden = params.get("show_hidden") == "true"

        hidden_filter = "" if show_hidden else "AND is_hidden = FALSE"
        cat_filter = f"AND category = '{escape(category)}'" if category else ""

        cur.execute(
            f"SELECT id, content, category, created_at, likes, is_hidden, parent_id FROM {SCHEMA}.messages WHERE 1=1 {hidden_filter} {cat_filter} ORDER BY created_at DESC LIMIT 300"
        )
        rows = cur.fetchall()
        conn.close()

        messages = [{"id": r[0], "content": r[1], "category": r[2], "created_at": str(r[3]), "likes": r[4] or 0, "is_hidden": r[5], "parent_id": r[6]} for r in rows]
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps({"messages": messages})}

    # hide — скрыть/показать пост
    if method == "PUT" and action == "hide":
        username = verify_token(mod_token)
        if not username:
            conn.close()
            return {"statusCode": 401, "headers": CORS_HEADERS, "body": json.dumps({"error": "Unauthorized"})}

        msg_id = int(body.get("id") or 0)
        hidden = bool(body.get("hidden", True))

        if not msg_id:
            conn.close()
            return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": "id required"})}

        cur.execute(f"UPDATE {SCHEMA}.messages SET is_hidden = {str(hidden).upper()} WHERE id = {msg_id} RETURNING id, is_hidden")
        row = cur.fetchone()
        conn.close()

        if not row:
            return {"statusCode": 404, "headers": CORS_HEADERS, "body": json.dumps({"error": "not found"})}

        return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps({"id": row[0], "is_hidden": row[1]})}

    conn.close()
    return {"statusCode": 404, "headers": CORS_HEADERS, "body": json.dumps({"error": "Unknown action"})}