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
    const row = await getMainRow(checked.value);
    // The deploy-time ACCESS_CODE env var is authoritative for the visitor gate;
    // the stored data.accessCode is only a fallback when the env is unset.
    // (Before this fix, the stored value won: a stale 20260526 left in the DB
    // overrode the intended 20260610 env, so the visitor login demanded 20260526.)
    const accessCode = String(process.env.ACCESS_CODE || row.data?.accessCode || "").trim();
    if (!accessCode || !timingSafeEqual(String(payload.code || "").trim(), accessCode)) {
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
