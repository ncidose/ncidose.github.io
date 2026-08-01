const json = (value, status = 200) =>
  Response.json(value, { status, headers: { "cache-control": "no-store" } });

const authorized = (request, env) =>
  request.headers.get("authorization") === `Bearer ${env.UPLOAD_TOKEN}`;

export default {
  async fetch(request, env) {
    if (!authorized(request, env)) return json({ error: "unauthorized" }, 401);

    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/head") {
        const key = url.searchParams.get("key");
        if (!key) return json({ error: "missing key" }, 400);
        const object = await env.BUCKET.head(key);
        if (!object) return json({ exists: false });
        return json({
          exists: true,
          key: object.key,
          size: object.size,
          etag: object.httpEtag,
          customMetadata: object.customMetadata || {},
        });
      }

      if (request.method === "GET" && url.pathname === "/list") {
        const cursor = url.searchParams.get("cursor") || undefined;
        const result = await env.BUCKET.list({ limit: 1000, cursor });
        return json({
          objects: result.objects.map((object) => ({ key: object.key, size: object.size })),
          truncated: result.truncated,
          cursor: result.truncated ? result.cursor : null,
        });
      }

      if (request.method === "POST" && url.pathname === "/multipart/create") {
        const { key, contentType, sha256 } = await request.json();
        if (!key || !sha256) return json({ error: "missing key or sha256" }, 400);
        const upload = await env.BUCKET.createMultipartUpload(key, {
          httpMetadata: { contentType: contentType || "application/octet-stream" },
          customMetadata: { sha256 },
        });
        return json({ uploadId: upload.uploadId });
      }

      if (request.method === "PUT" && url.pathname === "/multipart/part") {
        const key = url.searchParams.get("key");
        const uploadId = url.searchParams.get("uploadId");
        const partNumber = Number(url.searchParams.get("partNumber"));
        if (!key || !uploadId || !Number.isInteger(partNumber) || partNumber < 1) {
          return json({ error: "invalid multipart parameters" }, 400);
        }
        const upload = env.BUCKET.resumeMultipartUpload(key, uploadId);
        const part = await upload.uploadPart(partNumber, request.body);
        return json({ partNumber: part.partNumber, etag: part.etag });
      }

      if (request.method === "POST" && url.pathname === "/multipart/complete") {
        const { key, uploadId, parts } = await request.json();
        const upload = env.BUCKET.resumeMultipartUpload(key, uploadId);
        const object = await upload.complete(parts);
        return json({ key: object.key, size: object.size, etag: object.httpEtag });
      }

      if (request.method === "POST" && url.pathname === "/multipart/abort") {
        const { key, uploadId } = await request.json();
        await env.BUCKET.resumeMultipartUpload(key, uploadId).abort();
        return json({ aborted: true });
      }

      return json({ error: "not found" }, 404);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, 500);
    }
  },
};
