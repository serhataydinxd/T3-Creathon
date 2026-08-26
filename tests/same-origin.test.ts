import { describe, expect, it } from "vitest";
import { isSameOrigin } from "@/server/http/request";

const EDGE_HOST = "d1a8sno49hnlhc.cloudfront.net";

function edgeRequest(headers: Record<string, string>) {
  return new Request(`http://${EDGE_HOST}/api/workshops`, {
    method: "POST",
    headers,
  });
}

describe("same-origin validation behind the HTTPS edge", () => {
  it("accepts an HTTPS viewer whose origin hop arrived over plain HTTP", () => {
    // CloudFront terminates TLS, so the ALB reports the plaintext origin hop
    // while the browser still sends the https:// origin it actually used.
    expect(
      isSameOrigin(
        edgeRequest({
          origin: `https://${EDGE_HOST}`,
          host: EDGE_HOST,
          "x-forwarded-proto": "http",
          "sec-fetch-site": "same-origin",
        }),
      ),
    ).toBe(true);
  });

  it("accepts a direct same-origin request with no proxy headers", () => {
    expect(
      isSameOrigin(
        new Request("http://127.0.0.1:3000/api/workshops", {
          method: "POST",
          headers: { origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000" },
        }),
      ),
    ).toBe(true);
  });

  it("rejects another site posting through the edge", () => {
    expect(
      isSameOrigin(
        edgeRequest({
          origin: "https://attacker.example",
          host: EDGE_HOST,
          "x-forwarded-proto": "http",
        }),
      ),
    ).toBe(false);
  });

  it("rejects a cross-site fetch even when the origin host matches", () => {
    expect(
      isSameOrigin(
        edgeRequest({
          origin: `https://${EDGE_HOST}`,
          host: EDGE_HOST,
          "sec-fetch-site": "cross-site",
        }),
      ),
    ).toBe(false);
  });

  it("rejects a missing or opaque origin", () => {
    expect(isSameOrigin(edgeRequest({ host: EDGE_HOST }))).toBe(false);
    expect(isSameOrigin(edgeRequest({ origin: "null", host: EDGE_HOST }))).toBe(false);
  });

  it("does not confuse a host that merely shares a suffix", () => {
    expect(
      isSameOrigin(
        edgeRequest({
          origin: `https://evil-${EDGE_HOST}`,
          host: EDGE_HOST,
        }),
      ),
    ).toBe(false);
  });
});
