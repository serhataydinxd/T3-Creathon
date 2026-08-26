import "server-only";

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin || fetchSite === "cross-site") return false;
  const url = new URL(request.url);
  const expectedHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  // Compare hosts rather than whole origins. TLS terminates at the CloudFront
  // edge and the edge-to-ALB hop is plain HTTP, so the load balancer reports
  // `x-forwarded-proto: http` for a request the viewer made over HTTPS.
  // Comparing schemes would reject every request that arrives through the
  // edge. The host match plus the `sec-fetch-site` rejection above carries the
  // CSRF guarantee, which is also how Next.js validates Server Actions.
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  return originHost !== "" && originHost === expectedHost;
}

export async function readBoundedJson(request: Request, maxBytes = 16_384): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new Error("BODY_TOO_LARGE");
  if (!request.body) throw new Error("INVALID_JSON");
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("BODY_TOO_LARGE");
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("INVALID_JSON");
  }
}
