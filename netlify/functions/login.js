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
    const accessCode = String(row.data?.accessCode || process.env.ACCESS_CODE || "").trim();
    if (!accessCode || !timingSafeEqual(String(payload.code || "").trim(), accessCode)) {
      return json(401, { ok: false, error: "invalid access password" });
    }
    return json(200, { ok: true });
  } catch {
    return json(502, { ok: false, error: "state service unavailable" });
  }
};
