// Diagnostic endpoint: always returns 200 with JSON so we never get a bare 502.
// Tests whether the Supabase REST API is reachable from Netlify and what it returns.
const { config } = require("./_supabase");

async function timedFetch(url, opts, ms) {
  const ctrl = new AbortController();
  const aborter = setTimeout(() => ctrl.abort(), ms);
  // Hard guard: if fetch ignores the abort signal, still bail out and return JSON.
  const guard = new Promise((_, rej) =>
    setTimeout(() => rej(new Error(`hard-timeout-${ms + 1000}ms`)), ms + 1000)
  );
  try {
    return await Promise.race([fetch(url, { ...opts, signal: ctrl.signal }), guard]);
  } finally {
    clearTimeout(aborter);
  }
}

exports.handler = async function handler() {
  const value = config();
  const result = {
    supabaseConfigured: Boolean(value.url && value.key && value.table),
    url: value.url || "(empty)",
    table: value.table || "(empty)",
    keyPrefix: value.key ? value.key.slice(0, 10) + "..." : "(empty)",
    keyIsOpaque: value.key ? value.key.startsWith("sb_") : false,
    editCodeSet: Boolean(value.editCode),
    accessCodeEnv: Boolean(process.env.ACCESS_CODE),
    nodeVersion: process.version,
    steps: [],
  };

  if (!result.supabaseConfigured) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      body: JSON.stringify(result, null, 2),
    };
  }

  const start = Date.now();
  try {
    const endpoint = `${value.url}/rest/v1/${encodeURIComponent(value.table)}?id=eq.main&select=id,data,updated_at&limit=1`;
    const headers = { apikey: value.key };
    if (!value.key.startsWith("sb_")) headers.Authorization = `Bearer ${value.key}`;
    const response = await timedFetch(endpoint, { method: "GET", headers }, 5000);
    const text = await response.text().catch(() => "");
    result.steps.push({
      step: "supabase-rest",
      status: response.status,
      latencyMs: Date.now() - start,
      sample: text.slice(0, 240),
    });
    if (response.ok) {
      try {
        const rows = JSON.parse(text);
        const data = (rows && rows[0] && rows[0].data) || {};
        const mask = (v) =>
          v ? String(v).slice(0, 4) + "...(len " + String(v).length + ")" : "(none)";
        result.dataAccessCodeMasked = mask(data.accessCode);
        result.envAccessCodeMasked = mask(process.env.ACCESS_CODE);
        result.envEditCodeMasked = mask(process.env.EDIT_CODE);
      } catch {
        /* ignore parse for the extra fields */
      }
    }
  } catch (err) {
    result.steps.push({
      step: "supabase-rest",
      error: String((err && err.message) || err),
      latencyMs: Date.now() - start,
    });
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    body: JSON.stringify(result, null, 2),
  };
};
