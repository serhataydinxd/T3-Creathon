import { expect, test } from "@playwright/test";

/**
 * The favicon, social card and crawler routes were published with unit tests
 * over their generators but nothing asserting the browser is actually served
 * them. A broken asset path would have shipped silently.
 */

const ASSETS: Array<{ path: string; contentType: RegExp }> = [
  { path: "/robots.txt", contentType: /text\/plain/ },
  { path: "/sitemap.xml", contentType: /(xml)/ },
  { path: "/llms.txt", contentType: /text\/plain/ },
  { path: "/favicon.ico", contentType: /image\/(x-icon|vnd\.microsoft\.icon)/ },
  { path: "/icon.svg", contentType: /image\/svg\+xml/ },
  { path: "/apple-icon.png", contentType: /image\/png/ },
  { path: "/opengraph-image.png", contentType: /image\/png/ },
  { path: "/manifest.webmanifest", contentType: /(manifest\+json|application\/json)/ },
  { path: "/.well-known/security.txt", contentType: /text\/plain/ },
];

for (const asset of ASSETS) {
  test(`${asset.path} is served with a sensible content type`, async ({ request }) => {
    const response = await request.get(asset.path);
    expect(response.status(), asset.path).toBe(200);
    expect(response.headers()["content-type"] ?? "", asset.path).toMatch(asset.contentType);
  });
}

test("the home page head carries icons, a manifest and a social card", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('link[rel="icon"]').first()).toHaveCount(1);
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);

  for (const property of ["og:title", "og:description", "og:image", "og:type", "og:locale"]) {
    await expect(
      page.locator(`meta[property="${property}"]`),
      property,
    ).toHaveCount(1);
  }
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  await expect(page.locator('meta[name="theme-color"]').first()).toHaveCount(1);
});

test("the home page declares structured data a search engine can parse", async ({ page }) => {
  await page.goto("/");
  const payload = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(payload).toBeTruthy();

  const parsed = JSON.parse(payload!) as { "@graph"?: Array<{ "@type"?: string }> };
  const types = (parsed["@graph"] ?? []).map((node) => node["@type"]);
  expect(types).toContain("WebSite");
  expect(types).toContain("SoftwareApplication");
});

test("robots keeps crawlers out of the authenticated workflow", async ({ request }) => {
  const body = await (await request.get("/robots.txt")).text();
  // The guarded areas only ever answer a crawler with a login redirect.
  for (const route of ["/dashboard/", "/lab/", "/workshops/", "/print/", "/api/"]) {
    expect(body, route).toContain(`Disallow: ${route}`);
  }
  expect(body).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);
});

test("the sitemap lists only pages a visitor can read without an account", async ({ request }) => {
  const body = await (await request.get("/sitemap.xml")).text();
  const paths = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);

  expect(paths).toContain("/");
  for (const guarded of ["/dashboard", "/lab", "/login", "/register"]) {
    expect(paths, guarded).not.toContain(guarded);
  }
});

test("guarded pages ask not to be indexed", async ({ page }) => {
  // Reachable only after a redirect to login, but the directive must be present
  // for the case where a crawler follows an authenticated link.
  await page.goto("/login");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});
