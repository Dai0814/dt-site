const {
  config,
  json,
  timingSafeEqual,
  getMainRow,
  requireConfig,
} = require("./_supabase");

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "method not allowed" });
  const checked = requireConfig();
  if (!checked.ok) return checked.response;

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "invalid JSON" });
  }

  try {
    const entered = String(payload.code || "").trim();
    // The deploy-time ACCESS_CODE env var is authoritative for the visitor gate
    // and does NOT depend on the site_state table existing. This keeps the
    // visitor login working even when Supabase state storage is unconfigured.
    const envAccessCode = String(process.env.ACCESS_CODE || "").trim();
    if (envAccessCode) {
      if (!timingSafeEqual(entered, envAccessCode)) {
        return json(401, { ok: false, error: "invalid access password" });
      }
      return json(200, { ok: true });
    }
    // Fallback only when the env is unset: stored data.accessCode.
    const row = await getMainRow(checked.value);
    const accessCode = String(row.data?.accessCode || "").trim();
    if (!accessCode || !timingSafeEqual(entered, accessCode)) {
      return json(401, { ok: false, error: "invalid access password" });
    }
    return json(200, { ok: true });
  } catch (error) {
    console.error("[login] state service error:", error);
    return json(502, {
      ok: false,
      error: "state service unavailable",
      detail: String((error && error.message) || error),
    });
  }
};
