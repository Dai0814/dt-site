from pathlib import Path
from email.utils import formatdate, parsedate_to_datetime
import json
import os
import secrets
import tempfile
import time
from datetime import datetime, timezone
from urllib.parse import parse_qs, quote, urlparse
from urllib.request import Request as UrlRequest, urlopen

import requests
from flask import Flask, abort, jsonify, make_response, request, send_from_directory


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
STATE_FILE = DATA_DIR / "site-state.json"
UPLOAD_DIR = ROOT / "assets" / "uploads"
HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", "5500"))
MAX_BODY_BYTES = 30 * 1024 * 1024
MAX_IMAGE_BYTES = 8 * 1024 * 1024
EDITOR_TOKENS = set()
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("SUPABASE_SERVICE_KEY")
    or ""
)
SUPABASE_TABLE = os.environ.get("SUPABASE_TABLE", "site_state")
SUPABASE_STATE_ID = os.environ.get("SUPABASE_STATE_ID", "main")
SUPABASE_BUCKET = os.environ.get("SUPABASE_BUCKET", "uploads")
USE_SUPABASE = bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)
IMAGE_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}

app = Flask(__name__, static_folder=None)

DEFAULT_STATE = {
    "nameA": "D",
    "nameB": "T",
    "accessCode": "20260526",
    "editCode": "20260610",
    "startDate": "2026-05-26",
    "startTime": "23:29:00",
    "wishes": [
        {"text": "一起看一次海边日出", "done": False},
        {"text": "拍一组只属于我们的照片", "done": False},
        {"text": "把喜欢的城市慢慢走完", "done": False},
    ],
    "photos": ["", "", ""],
    "travelEntries": [
        {
            "id": "travel-beijing",
            "place": "北京",
            "status": "visited",
            "note": "把第一颗星标留给一起想念的地方。",
            "photo": "",
            "x": 70,
            "y": 45,
        },
        {
            "id": "travel-chengdu",
            "place": "成都",
            "status": "wishlist",
            "note": "想去街巷里慢慢走，吃一顿热气腾腾的火锅。",
            "photo": "",
            "x": 51,
            "y": 68,
        },
        {
            "id": "travel-sanya",
            "place": "三亚",
            "status": "next",
            "note": "下一次去看海，把日落和风都带回来。",
            "photo": "",
            "x": 65,
            "y": 94,
        },
    ],
    "contentEntries": {"story": [], "daily": [], "notes": [], "storyTimeline": []},
    "capsules": [],
    "edits": {},
    "editTimes": {},
    "updatedAt": "",
}


def normalize_state(raw):
    if not isinstance(raw, dict):
        raw = {}

    # Keep sites saved with the former single loginCode usable as access code.
    if "accessCode" not in raw and raw.get("loginCode"):
        raw = {**raw, "accessCode": raw["loginCode"]}

    state = {**DEFAULT_STATE, **raw}
    state.pop("loginCode", None)
    if not isinstance(state.get("wishes"), list):
        state["wishes"] = DEFAULT_STATE["wishes"]
    if not isinstance(state.get("photos"), list):
        state["photos"] = DEFAULT_STATE["photos"]
    if not isinstance(state.get("edits"), dict):
        state["edits"] = {}
    if not isinstance(state.get("editTimes"), dict):
        state["editTimes"] = {}
    if not isinstance(state.get("contentEntries"), dict):
        state["contentEntries"] = DEFAULT_STATE["contentEntries"]
    if not isinstance(state.get("capsules"), list):
        state["capsules"] = []

    state["photos"] = (state["photos"] + ["", "", ""])[:3]
    for key in ("story", "daily", "notes", "storyTimeline"):
        if not isinstance(state["contentEntries"].get(key), list):
            state["contentEntries"][key] = []
    return state


def supabase_headers(extra=None):
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    }
    headers.update(extra or {})
    return headers


def read_local_state():
    if not STATE_FILE.exists():
        return normalize_state({})

    try:
        with STATE_FILE.open("r", encoding="utf-8") as file:
            return normalize_state(json.load(file))
    except (OSError, json.JSONDecodeError):
        return normalize_state({})


def write_local_state(state):
    DATA_DIR.mkdir(exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix="site-state-", suffix=".json", dir=DATA_DIR)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            json.dump(state, file, ensure_ascii=False, indent=2)
        os.replace(temp_name, STATE_FILE)
    finally:
        if os.path.exists(temp_name):
            os.remove(temp_name)

    return state


def read_supabase_state():
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}",
        params={
            "id": f"eq.{SUPABASE_STATE_ID}",
            "select": "data",
            "limit": "1",
        },
        headers=supabase_headers(),
        timeout=12,
    )
    response.raise_for_status()
    rows = response.json()
    if rows and isinstance(rows[0].get("data"), dict):
        return normalize_state(rows[0]["data"])
    return normalize_state({})


def write_supabase_state(state):
    payload = {
        "id": SUPABASE_STATE_ID,
        "data": state,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}",
        params={"on_conflict": "id"},
        headers=supabase_headers({
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=representation",
        }),
        json=payload,
        timeout=12,
    )
    response.raise_for_status()
    rows = response.json()
    if rows and isinstance(rows[0].get("data"), dict):
        return normalize_state(rows[0]["data"])
    return state


def read_state():
    if USE_SUPABASE:
        try:
            return read_supabase_state()
        except requests.RequestException as exc:
            print(f"Supabase state read failed, falling back to local file: {exc}")
    return read_local_state()


def write_state(state):
    existing = read_state()
    if not isinstance(state, dict):
        state = {}
    # The editor password is never exposed to the browser state payload.
    state = {
        **state,
        "accessCode": state.get("accessCode", existing["accessCode"]),
        "editCode": existing["editCode"],
    }
    state = normalize_state(state)
    state["updatedAt"] = str(int(time.time() * 1000))

    if USE_SUPABASE:
        try:
            return write_supabase_state(state)
        except requests.RequestException as exc:
            print(f"Supabase state write failed, falling back to local file: {exc}")

    return write_local_state(state)


def state_updated_at_ms(state):
    try:
        return int(state.get("updatedAt") or 0)
    except (TypeError, ValueError):
        return 0


def state_etag(state, authorized):
    updated_at = state_updated_at_ms(state)
    if not updated_at:
        return ""
    mode = "editor" if authorized else "viewer"
    return f'W/"state-{updated_at}-{mode}"'


def state_last_modified(state):
    updated_at = state_updated_at_ms(state)
    if not updated_at:
        return ""
    return formatdate(updated_at / 1000, usegmt=True)


def request_is_not_modified(headers, etag, last_modified):
    if_none_match = headers.get("If-None-Match", "")
    if if_none_match:
        return etag and any(tag.strip() == etag for tag in if_none_match.split(","))

    if_modified_since = headers.get("If-Modified-Since", "")
    if not if_modified_since or not last_modified:
        return False

    try:
        since = parsedate_to_datetime(if_modified_since)
        modified = parsedate_to_datetime(last_modified)
    except (TypeError, ValueError, IndexError, OverflowError):
        return False
    return since >= modified


def geocode_place(path):
    parsed = urlparse(path)
    query = parse_qs(parsed.query).get("q", [""])[0].strip()
    if not query:
        return {"ok": False, "error": "missing query"}

    url = (
        "https://nominatim.openstreetmap.org/search"
        f"?format=json&limit=1&countrycodes=cn&accept-language=zh-CN&q={quote(query)}"
    )
    geo_request = UrlRequest(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "D-T-local-travel-map/1.0",
        },
    )

    try:
        with urlopen(geo_request, timeout=8) as response:
            results = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        return {"ok": False, "error": str(exc)}

    if not results:
        return {"ok": False, "error": "not found"}

    result = results[0]
    try:
        lat = float(result["lat"])
        lon = float(result["lon"])
    except (KeyError, TypeError, ValueError):
        return {"ok": False, "error": "invalid result"}

    if lat < 15 or lat > 55 or lon < 70 or lon > 140:
        return {"ok": False, "error": "outside China"}

    return {
        "ok": True,
        "name": result.get("display_name", query),
        "lat": lat,
        "lon": lon,
    }


def json_response(payload, status=200, headers=None):
    response = make_response(json.dumps(payload, ensure_ascii=False), status)
    response.headers["Content-Type"] = "application/json; charset=utf-8"
    for key, value in (headers or {}).items():
        if value:
            response.headers[key] = value
    return response


def json_error(message, status):
    return json_response({"ok": False, "error": message}, status=status)


def is_editor_authorized():
    token = request.headers.get("X-Edit-Token", "")
    return bool(token) and token in EDITOR_TOKENS


def read_json_body(max_bytes):
    length = request.content_length or 0
    if length > max_bytes:
        return None, json_error("Request is too large", 413)

    try:
        payload = request.get_json(silent=False) if length else {}
    except Exception:
        return None, json_error("Invalid JSON", 400)

    if payload is None:
        payload = {}
    if not isinstance(payload, dict):
        return None, json_error("Invalid JSON", 400)
    return payload, None


def save_local_image(name, data):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    target = UPLOAD_DIR / name
    with target.open("wb") as file:
        file.write(data)
    return f"assets/uploads/{name}"


def save_supabase_image(name, content_type, data):
    object_path = f"images/{name}"
    response = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{object_path}",
        headers=supabase_headers({
            "Content-Type": content_type,
            "x-upsert": "false",
        }),
        data=data,
        timeout=30,
    )
    response.raise_for_status()
    return f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{object_path}"


@app.after_request
def add_no_store_headers(response):
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/api/health")
def health():
    return jsonify({"ok": True, "storage": "supabase" if USE_SUPABASE else "local"})


@app.get("/api/state")
def get_state():
    authorized = is_editor_authorized()
    state = read_state()
    etag = state_etag(state, authorized)
    last_modified = state_last_modified(state)
    if request_is_not_modified(request.headers, etag, last_modified):
        response = make_response("", 304)
        if etag:
            response.headers["ETag"] = etag
        if last_modified:
            response.headers["Last-Modified"] = last_modified
        return response

    if not authorized:
        state.pop("accessCode", None)
    state.pop("editCode", None)
    return json_response(state, headers={
        "ETag": etag,
        "Last-Modified": last_modified,
    })


@app.post("/api/state")
def post_state():
    if not is_editor_authorized():
        return json_error("editor authorization required", 401)

    payload, error = read_json_body(MAX_BODY_BYTES)
    if error:
        return error

    state = write_state(payload)
    return json_response(state, headers={
        "ETag": state_etag(state, True),
        "Last-Modified": state_last_modified(state),
    })


@app.post("/api/auth")
def authenticate_editor():
    payload, error = read_json_body(4096)
    if error:
        return error

    code = str(payload.get("code", "")).strip()
    if not secrets.compare_digest(code, str(read_state()["editCode"])):
        return json_error("invalid editor password", 401)

    token = secrets.token_urlsafe(32)
    EDITOR_TOKENS.add(token)
    return jsonify({"ok": True, "token": token})


@app.post("/api/login")
def authenticate_site():
    payload, error = read_json_body(4096)
    if error:
        return error

    code = str(payload.get("code", "")).strip()
    if not secrets.compare_digest(code, str(read_state()["accessCode"])):
        return json_error("invalid access password", 401)

    return jsonify({"ok": True})


@app.post("/api/images")
def upload_image():
    if not is_editor_authorized():
        return json_error("editor authorization required", 401)

    content_type = request.headers.get("Content-Type", "").split(";")[0].strip().lower()
    extension = IMAGE_CONTENT_TYPES.get(content_type)
    if not extension:
        return json_error("unsupported image type", 415)

    length = request.content_length or 0
    if length <= 0:
        return json_error("Image is empty", 400)
    if length > MAX_IMAGE_BYTES:
        return json_error("Image is too large", 413)

    data = request.get_data(cache=False)
    if not data:
        return json_error("Image is empty", 400)
    if len(data) > MAX_IMAGE_BYTES:
        return json_error("Image is too large", 413)

    name = f"{int(time.time() * 1000)}-{secrets.token_urlsafe(8)}.{extension}"
    try:
        src = save_supabase_image(name, content_type, data) if USE_SUPABASE else save_local_image(name, data)
    except requests.RequestException as exc:
        print(f"Supabase image upload failed, falling back to local file: {exc}")
        src = save_local_image(name, data)

    return jsonify({
        "ok": True,
        "src": src,
        "bytes": len(data),
    })


@app.get("/api/geocode")
def geocode():
    return jsonify(geocode_place(request.full_path))


@app.route("/data/<path:_path>")
def hide_data_files(_path):
    abort(404)


@app.route("/")
def serve_home():
    return send_from_directory(ROOT, "index.html")


@app.route("/<path:path>")
def serve_static(path):
    if path.startswith("api/") or path.startswith("data/"):
        abort(404)

    target = (ROOT / path).resolve()
    if not target.is_relative_to(ROOT) or not target.exists() or target.is_dir():
        abort(404)

    return send_from_directory(ROOT, path)


if __name__ == "__main__":
    DATA_DIR.mkdir(exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Serving D&T site on http://127.0.0.1:{PORT}/")
    app.run(host=HOST, port=PORT)
