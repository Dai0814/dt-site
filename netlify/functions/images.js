const crypto = require("crypto");

const IMAGE_CONTENT_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(payload),
  };
}

function quotePath(value) {
  return String(value)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function getPublicUrl(supabaseUrl, bucket, objectPath) {
  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${quotePath(objectPath)}`;
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "method not allowed" });
  }

  const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
  const bucket = String(process.env.SUPABASE_BUCKET || "album-photos").replace(/^\/+|\/+$/g, "");
  const uploadCode = process.env.EDIT_CODE || process.env.SUPABASE_UPLOAD_CODE || "";

  if (!supabaseUrl || !serviceRoleKey || !bucket) {
    return json(500, { ok: false, error: "supabase storage is not configured" });
  }
  if (!uploadCode) {
    return json(500, { ok: false, error: "upload code is not configured" });
  }
  const requestCode = event.headers["x-edit-code"] || event.headers["X-Edit-Code"] || "";
  if (!safeEqual(requestCode, uploadCode)) {
    return json(401, { ok: false, error: "editor authorization required" });
  }

  const contentType = String(event.headers["content-type"] || event.headers["Content-Type"] || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const extension = IMAGE_CONTENT_TYPES[contentType];
  if (!extension) {
    return json(415, { ok: false, error: "unsupported image type" });
  }

  if (!event.body) {
    return json(400, { ok: false, error: "image is empty" });
  }

  const buffer = Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8");
  if (!buffer.length) {
    return json(400, { ok: false, error: "image is empty" });
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    return json(413, { ok: false, error: "image is too large" });
  }

  const bodyHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const headerHash = String(event.headers["x-image-hash"] || event.headers["X-Image-Hash"] || "").trim().toLowerCase();
  const imageHash = /^[a-f0-9]{64}$/.test(headerHash) ? headerHash : bodyHash;
  const objectPath = `album/dedup/${imageHash}.${extension}`;
  const publicUrl = getPublicUrl(supabaseUrl, bucket, objectPath);

  const existsResponse = await fetch(publicUrl, { method: "HEAD" }).catch(() => null);
  if (existsResponse?.ok) {
    return json(200, {
      ok: true,
      src: publicUrl,
      bytes: buffer.length,
      storage: "supabase",
      imageHash,
      reused: true,
    });
  }

  const uploadUrl = `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${quotePath(objectPath)}`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
      "Content-Type": contentType,
      "x-upsert": "false",
    },
    body: buffer,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if ((response.status === 400 || response.status === 409) && /already|exist|duplicate/i.test(detail)) {
      return json(200, {
        ok: true,
        src: publicUrl,
        bytes: buffer.length,
        storage: "supabase",
        imageHash,
        reused: true,
      });
    }
    return json(response.status, {
      ok: false,
      error: "supabase upload failed",
      detail: detail.slice(0, 300),
    });
  }

  return json(200, {
    ok: true,
    src: publicUrl,
    bytes: buffer.length,
    storage: "supabase",
    imageHash,
    reused: false,
  });
};
