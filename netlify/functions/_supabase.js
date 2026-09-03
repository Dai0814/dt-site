const crypto = require("crypto");

function config() {
  return {
    url: String(process.env.SUPABASE_URL || "").replace(/\/+$/, ""),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "",
    table: String(process.env.SUPABASE_STATE_TABLE || "site_state").trim(),
    editCode: String(process.env.EDIT_CODE || "").trim(),
  };
}

function json(statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  };
}

function timingSafeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createEditToken(code) {
  const timestamp = String(Date.now());
  const signature = crypto.createHmac("sha256", code).update(timestamp).digest("base64url");
  return `${timestamp}.${signature}`;
}

function verifyEditToken(token, code) {
  const parts = String(token || "").split(".");
  if (parts.length !== 2 || !/^\d+$/.test(parts[0])) return false;
  const age = Date.now() - Number(parts[0]);
  if (!Number.isFinite(age) || age < 0 || age > 7 * 24 * 60 * 60 * 1000) return false;
  const expected = crypto.createHmac("sha256", code).update(parts[0]).digest("base64url");
  return timingSafeEqual(parts[1], expected);
}

function getHeader(event, name) {
  const headers = event?.headers || {};
  const wanted = name.toLowerCase();
  const key = Object.keys(headers).find((item) => item.toLowerCase() === wanted);
  return key ? String(headers[key] || "") : "";
}

function isEditor(event, code) {
  return Boolean(code) && verifyEditToken(getHeader(event, "x-edit-token"), code);
}

function requireConfig() {
  const value = config();
  if (!value.url || !value.key || !value.table) {
    return { ok: false, response: json(500, { ok: false, error: "supabase is not configured" }) };
  }
  return { ok: true, value };
}

async function getMainRow(value) {
  const endpoint = `${value.url}/rest/v1/${encodeURIComponent(value.table)}?id=eq.main&select=data,updated_at`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: value.key,
      Authorization: `Bearer ${value.key}`,
    },
  });
  if (!response.ok) throw new Error(`state read failed (${response.status})`);
  const rows = await response.json();
  return rows[0] || { data: {}, updated_at: "" };
}

async function saveMainRow(value, data) {
  const updatedAt = String(Date.now());
  const endpoint = `${value.url}/rest/v1/${encodeURIComponent(value.table)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: value.key,
      Authorization: `Bearer ${value.key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([{ id: "main", data, updated_at: new Date(Number(updatedAt)).toISOString() }]),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`state save failed (${response.status}): ${detail.slice(0, 240)}`);
  }
  return { ...data, updatedAt };
}

module.exports = {
  config,
  json,
  timingSafeEqual,
  createEditToken,
  verifyEditToken,
  getHeader,
  isEditor,
  requireConfig,
  getMainRow,
  saveMainRow,
};
