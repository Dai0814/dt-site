#!/usr/bin/env python3
"""Safely seed the live Supabase `site_state` table from the local site-state.json.

- Read-only first: fetches the live row and prints what's there.
- Only writes (upsert id=main) when the live row is effectively empty.
- Never deletes or overwrites existing live content.
"""
import json
import os
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT / ".env"
STATE_PATH = ROOT / "data" / "site-state.json"


def load_env(path):
    env = {}
    if not path.is_file():
        return env
    for raw in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        k, v = line.split("=", 1)
        k, v = k.strip(), v.strip()
        if len(v) >= 2 and v[0] == v[-1] and v[0] in {"'", '"'}:
            v = v[1:-1]
        env[k] = v
    return env


env = load_env(ENV_PATH)
URL = env.get("SUPABASE_URL", "").rstrip("/")
KEY = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_KEY") or ""
TABLE = env.get("SUPABASE_STATE_TABLE", "site_state").strip() or "site_state"

if not (URL and KEY):
    print("ERROR: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not found in .env")
    raise SystemExit(1)

HEADERS = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
}


def get_live():
    endpoint = f"{URL}/rest/v1/{TABLE}?id=eq.main&select=data,updated_at"
    req = urllib.request.Request(endpoint, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        rows = json.loads(resp.read().decode("utf-8"))
    return rows[0] if rows else None


def is_empty(row):
    if not row:
        return True
    data = row.get("data") or {}
    ce = data.get("contentEntries") or {}
    has_content = any(isinstance(ce.get(k), list) and ce[k] for k in
                     ("story", "notes", "storyTimeline"))
    has_photos = bool(data.get("photoEntries"))
    return not (has_content or has_photos or data.get("wishes") or data.get("travelEntries"))


def upsert(local_state):
    endpoint = f"{URL}/rest/v1/{TABLE}"
    payload = json.dumps([{
        "id": "main",
        "data": local_state,
        "updated_at": __import__("datetime").datetime.utcnow().isoformat(),
    }]).encode("utf-8")
    req = urllib.request.Request(
        endpoint, data=payload, method="POST",
        headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=representation"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.status, resp.read().decode("utf-8")


print(f"Supabase URL : {URL}")
print(f"Table        : {TABLE}")
print("Reading live row...")
try:
    live = get_live()
except urllib.error.HTTPError as e:
    print(f"HTTP ERROR {e.code}: {e.read().decode('utf-8', 'ignore')[:300]}")
    print("=> The site_state table may not exist yet, or credentials are wrong.")
    raise SystemExit(1)
except Exception as e:
    print(f"ERROR fetching live state: {e}")
    raise SystemExit(1)

if live:
    data = live.get("data") or {}
    ce = data.get("contentEntries") or {}
    print("Live row found:")
    print(f"  updated_at      : {live.get('updated_at')}")
    print(f"  story entries   : {len(ce.get('story', []))}")
    print(f"  notes entries   : {len(ce.get('notes', []))}")
    print(f"  photoEntries    : {len(data.get('photoEntries', []))}")
    print(f"  travelEntries   : {len(data.get('travelEntries', []))}")
else:
    print("Live row: NONE (table empty / no 'main' row)")

if not is_empty(live):
    print("\nLive already has content -> NOT overwriting. You're good.")
    raise SystemExit(0)

print("\nLive is empty -> seeding from local data/site-state.json ...")
local_state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
status, body = upsert(local_state)
print(f"Upsert status: {status}")
print(f"Upsert response: {body[:300]}")

# verify
print("\nVerifying live row after seed...")
live2 = get_live()
if live2:
    data2 = live2.get("data") or {}
    ce2 = data2.get("contentEntries") or {}
    print(f"  story entries   : {len(ce2.get('story', []))}")
    print(f"  notes entries   : {len(ce2.get('notes', []))}")
    print(f"  photoEntries    : {len(data2.get('photoEntries', []))}")
    print("=> Seed complete.")
else:
    print("=> Verify failed: live row still missing.")
