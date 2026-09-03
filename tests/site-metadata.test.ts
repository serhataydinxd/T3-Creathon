import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import manifest from "@/app/manifest";
import { GET as llms } from "@/app/llms.txt/route";
import { PRIVATE_ROUTES, absoluteUrl, resolveSiteUrl } from "@/server/site";

describe("site origin resolution", () => {
  it("prefers an explicit SITE_URL and keeps only its origin", () => {
    expect(resolveSiteUrl({ SITE_URL: "https://imkan.example/alt/" })).toBe(
      "https://imkan.example",
    );
  });

  it("falls back to localhost outside production and the deployment in it", () => {
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
    expect(resolveSiteUrl({ NODE_ENV: "production" })).toMatch(/^https:\/\//);
  });

  it("ignores an unparsable value rather than breaking rendering", () => {
    expect(resolveSiteUrl({ SITE_URL: "not a url" })).toBe("http://localhost:3000");
  });

  it("joins paths onto the resolved origin", () => {
    expect(absoluteUrl("/sitemap.xml", { SITE_URL: "https://imkan.example" })).toBe(
      "https://imkan.example/sitemap.xml",
    );
  });
});

describe("robots.txt", () => {
  const result = robots();
  const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;

  it("invites crawlers to the public site", () => {
    expect(rule.userAgent).toBe("*");
    expect(rule.allow).toBe("/");
  });

  it("keeps every authenticated route out of the crawl", () => {
    const disallowed = [rule.disallow].flat().filter(Boolean) as string[];
    for (const route of PRIVATE_ROUTES) {
      expect(disallowed).toContain(`${route}/`);
    }
  });

  it("points at an absolute sitemap", () => {
    expect(String(result.sitemap)).toMatch(/^https?:\/\/.+\/sitemap\.xml$/);
  });
});

describe("sitemap.xml", () => {
  const entries = sitemap();

  it("lists only the pages a visitor can read without an account", () => {
    expect(entries.map((entry) => new URL(entry.url).pathname)).toEqual(["/", "/about"]);
  });

  it("uses absolute URLs and ranks the home page first", () => {
    expect(entries.every((entry) => entry.url.startsWith("http"))).toBe(true);
    expect(entries[0].priority).toBe(1);
  });

  it("never advertises a guarded or auth route", () => {
    const listed = entries.map((entry) => new URL(entry.url).pathname);
    for (const route of [...PRIVATE_ROUTES, "/login", "/register"]) {
      expect(listed).not.toContain(route);
    }
  });
});

describe("llms.txt", () => {
  it("follows the convention: an H1 name and a blockquote summary", async () => {
    const body = await llms().text();
    const lines = body.split("\n");
    expect(lines[0]).toMatch(/^# /);
    expect(lines[2]).toMatch(/^> /);
  });

  it("states the boundary between what the model writes and what code owns", async () => {
    const body = await llms().text();
    expect(body).toContain("yalnızca atölyenin metnini");
    expect(body).toContain("Kilitli kazanım metni");
    expect(body).toContain("çevrimdışı plana düşer");
  });

  it("serves plain text with absolute links", async () => {
    const response = llms();
    expect(response.headers.get("Content-Type")).toContain("text/plain");
    const body = await response.text();
    expect(body).toMatch(/\(https?:\/\//);
  });
});

describe("web manifest", () => {
  const result = manifest();

  it("declares Turkish, a start URL and both icon sizes", () => {
    expect(result.lang).toBe("tr");
    expect(result.start_url).toBe("/");
    const sizes = (result.icons ?? []).map((icon) => icon.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  it("includes a maskable icon so Android does not letterbox it", () => {
    expect((result.icons ?? []).some((icon) => icon.purpose === "maskable")).toBe(true);
  });
});

describe("deployment wiring for the canonical origin", () => {
  const service = JSON.parse(
    readFileSync(new URL("../infra/aws/service.json", import.meta.url), "utf8"),
  ) as {
    Parameters: Record<string, { Default?: string; AllowedPattern?: string }>;
    Resources: {
      WebTaskDefinition: {
        Properties: {
          ContainerDefinitions: Array<{ Environment: Array<{ Name: string; Value: unknown }> }>;
        };
      };
    };
  };
  const workflow = readFileSync(
    new URL("../.github/workflows/deploy-staging.yml", import.meta.url),
    "utf8",
  );

  it("passes the edge URL into the task rather than hardcoding a host", () => {
    expect(service.Parameters.SiteUrl.Default).toBe("");
    const env = service.Resources.WebTaskDefinition.Properties.ContainerDefinitions[0].Environment;
    expect(env.find((entry) => entry.Name === "SITE_URL")?.Value).toEqual({ Ref: "SiteUrl" });
    expect(workflow).toContain('SiteUrl="$HTTPS_URL"');
  });

  it("publishes a security contact that matches the policy", () => {
    const securityTxt = readFileSync(
      new URL("../public/.well-known/security.txt", import.meta.url),
      "utf8",
    );
    expect(securityTxt).toMatch(/^Contact: mailto:.+@.+$/m);
    expect(securityTxt).toMatch(/^Expires: \d{4}-\d{2}-\d{2}T/m);
    const policy = readFileSync(new URL("../SECURITY.md", import.meta.url), "utf8");
    const contact = securityTxt.match(/^Contact: mailto:(.+)$/m)?.[1];
    expect(policy).toContain(contact);
  });
});
