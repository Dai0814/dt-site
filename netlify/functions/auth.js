const {
  config,
  json,
  timingSafeEqual,
  createEditToken,
} = require("./_supabase");

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "method not allowed" });
  const value = config();
  if (!value.editCode) return json(500, { ok: false, error: "edit code is not configured" });

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "invalid JSON" });
  }

  const code = String(payload.code || "").trim();
  if (!timingSafeEqual(code, value.editCode)) {
    return json(401, { ok: false, error: "invalid editor password" });
  }
  return json(200, { ok: true, token: createEditToken(value.editCode) });
};
