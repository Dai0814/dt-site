const {
  config,
  json,
  getHeader,
  isEditor,
  requireConfig,
  getMainRow,
  saveMainRow,
} = require("./_supabase");

function publicState(data, authorized) {
  const result = { ...(data && typeof data === "object" ? data : {}) };
  if (!authorized) delete result.accessCode;
  delete result.editCode;
  return result;
}

exports.handler = async function handler(event) {
  const checked = requireConfig();
  if (!checked.ok) return checked.response;
  const value = checked.value;
  const authorized = isEditor(event, value.editCode);

  try {
    const row = await getMainRow(value);
    const data = { ...(row.data && typeof row.data === "object" ? row.data : {}) };
    const updatedAt = String(data.updatedAt || (row.updated_at ? Date.parse(row.updated_at) : "") || "");
    data.updatedAt = updatedAt;

    if (event.httpMethod === "GET") {
      return json(200, publicState(data, authorized), {
        ETag: updatedAt ? `W/"state-${updatedAt}-${authorized ? "editor" : "viewer"}"` : "",
      });
    }

    if (event.httpMethod !== "POST") return json(405, { ok: false, error: "method not allowed" });
    if (!authorized) return json(401, { ok: false, error: "editor authorization required" });

    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { ok: false, error: "invalid JSON" });
    }

    delete payload.editCode;
    const saved = await saveMainRow(value, payload);
    return json(200, saved);
  } catch (error) {
    return json(502, { ok: false, error: "state service unavailable" });
  }
};
