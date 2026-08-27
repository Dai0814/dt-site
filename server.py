from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
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
HOST = "0.0.0.0"
PORT = 5500
MAX_BODY_BYTES = 30 * 1024 * 1024
EDITOR_TOKENS = set()

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
            state = read_state()
            if not self.is_editor_authorized():
                state.pop("accessCode", None)
            state.pop("editCode", None)
            self.send_json(state)
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

        self.send_json(write_state(payload))

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

    def send_json(self, payload, status=200):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    DATA_DIR.mkdir(exist_ok=True)
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Serving D&T site on http://127.0.0.1:{PORT}/")
    server.serve_forever()
