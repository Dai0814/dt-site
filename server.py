from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from email.utils import formatdate, parsedate_to_datetime
import json
import os
import secrets
import tempfile
import time
from urllib.parse import parse_qs, quote, urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
STATE_FILE = DATA_DIR / "site-state.json"
UPLOAD_DIR = ROOT / "assets" / "uploads"
HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", "5500"))
MAX_BODY_BYTES = 30 * 1024 * 1024
MAX_IMAGE_BYTES = 8 * 1024 * 1024
EDITOR_TOKENS = set()
IMAGE_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}

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


def read_state():
    if not STATE_FILE.exists():
        return normalize_state({})

    try:
        with STATE_FILE.open("r", encoding="utf-8") as file:
            return normalize_state(json.load(file))
    except (OSError, json.JSONDecodeError):
        return normalize_state({})


def write_state(state):
    DATA_DIR.mkdir(exist_ok=True)
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

    fd, temp_name = tempfile.mkstemp(prefix="site-state-", suffix=".json", dir=DATA_DIR)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            json.dump(state, file, ensure_ascii=False, indent=2)
        os.replace(temp_name, STATE_FILE)
    finally:
        if os.path.exists(temp_name):
            os.remove(temp_name)

    return state


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
    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "D-T-local-travel-map/1.0",
        },
    )

    try:
        with urlopen(request, timeout=8) as response:
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


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if self.path.startswith("/api/state"):
            authorized = self.is_editor_authorized()
            state = read_state()
            etag = state_etag(state, authorized)
            last_modified = state_last_modified(state)
            if request_is_not_modified(self.headers, etag, last_modified):
                self.send_response(304)
                if etag:
                    self.send_header("ETag", etag)
                if last_modified:
                    self.send_header("Last-Modified", last_modified)
                self.send_header("Content-Length", "0")
                self.end_headers()
                return

            if not authorized:
                state.pop("accessCode", None)
            state.pop("editCode", None)
            self.send_json(state, headers={
                "ETag": etag,
                "Last-Modified": last_modified,
            })
            return
        if self.path.startswith("/data/"):
            self.send_error(404)
            return
        if self.path.startswith("/api/health"):
            self.send_json({"ok": True})
            return
        if self.path.startswith("/api/geocode"):
            self.send_json(geocode_place(self.path))
            return
        super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/login"):
            self.authenticate_site()
            return

        if self.path.startswith("/api/auth"):
            self.authenticate_editor()
            return

        if self.path.startswith("/api/images"):
            self.upload_image()
            return

        if not self.path.startswith("/api/state"):
            self.send_error(404)
            return

        if not self.is_editor_authorized():
            self.send_json({"ok": False, "error": "editor authorization required"}, status=401)
            return

        length = int(self.headers.get("Content-Length", "0") or "0")
        if length > MAX_BODY_BYTES:
            self.send_error(413, "State is too large")
            return

        try:
            body = self.rfile.read(length).decode("utf-8")
            payload = json.loads(body or "{}")
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_error(400, "Invalid JSON")
            return

        state = write_state(payload)
        self.send_json(state, headers={
            "ETag": state_etag(state, True),
            "Last-Modified": state_last_modified(state),
        })

    def is_editor_authorized(self):
        token = self.headers.get("X-Edit-Token", "")
        return bool(token) and token in EDITOR_TOKENS

    def authenticate_editor(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length > 4096:
            self.send_error(413, "Request is too large")
            return

        try:
            body = self.rfile.read(length).decode("utf-8")
            code = str(json.loads(body or "{}").get("code", "")).strip()
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_error(400, "Invalid JSON")
            return

        if not secrets.compare_digest(code, str(read_state()["editCode"])):
            self.send_json({"ok": False, "error": "invalid editor password"}, status=401)
            return

        token = secrets.token_urlsafe(32)
        EDITOR_TOKENS.add(token)
        self.send_json({"ok": True, "token": token})

    def authenticate_site(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length > 4096:
            self.send_error(413, "Request is too large")
            return

        try:
            body = self.rfile.read(length).decode("utf-8")
            code = str(json.loads(body or "{}").get("code", "")).strip()
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_error(400, "Invalid JSON")
            return

        if not secrets.compare_digest(code, str(read_state()["accessCode"])):
            self.send_json({"ok": False, "error": "invalid access password"}, status=401)
            return

        self.send_json({"ok": True})

    def upload_image(self):
        if not self.is_editor_authorized():
            self.send_json({"ok": False, "error": "editor authorization required"}, status=401)
            return

        content_type = self.headers.get("Content-Type", "").split(";")[0].strip().lower()
        extension = IMAGE_CONTENT_TYPES.get(content_type)
        if not extension:
            self.send_json({"ok": False, "error": "unsupported image type"}, status=415)
            return

        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            self.send_error(400, "Image is empty")
            return
        if length > MAX_IMAGE_BYTES:
            self.send_error(413, "Image is too large")
            return

        data = self.rfile.read(length)
        if len(data) != length:
            self.send_error(400, "Invalid image body")
            return

        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        name = f"{int(time.time() * 1000)}-{secrets.token_urlsafe(8)}.{extension}"
        target = UPLOAD_DIR / name
        with target.open("wb") as file:
            file.write(data)

        self.send_json({
            "ok": True,
            "src": f"assets/uploads/{name}",
            "bytes": len(data),
        })

    def send_json(self, payload, status=200, headers=None):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        for key, value in (headers or {}).items():
            if value:
                self.send_header(key, value)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    DATA_DIR.mkdir(exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Serving D&T site on http://127.0.0.1:{PORT}/")
    server.serve_forever()
