import "server-only";

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin || fetchSite === "cross-site") return false;
  const url = new URL(request.url);
  const protocol = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return origin === `${protocol}://${host}`;
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
