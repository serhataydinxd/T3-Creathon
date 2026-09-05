/**
 * Single source of truth for the public identity of the deployment, shared by
 * the metadata routes so robots.txt, the sitemap, llms.txt and the page
 * metadata can never disagree about the canonical origin — or about what the
 * product is. The wording uses Bilim Türkiye's own vocabulary: atölye konusu,
 * oturum, merkez, eğitmen.
 */

export const SITE_NAME = "İMKÂN";

export const SITE_TAGLINE =
  "Atölye konusu sabit kalır; oturum, merkezin imkânlarına göre yeniden tasarlanır.";

export const SITE_DESCRIPTION =
  "Bilim Türkiye atölye konularını, merkezin gerçek imkânlarına uyarlanmış, " +
  "pedagog onaylı ve yazdırılabilir bir oturum paketine dönüştüren yapay zekâ asistanı.";

/**
 * When the public content last changed, for the sitemap. Crawlers use it to
 * decide whether to re-fetch, so a date that stops moving is worse than no
 * date at all: bump it with any change to the corpus or the public pages.
 */
export const CONTENT_UPDATED_ON = "2026-09-04";

const FALLBACK_PRODUCTION_URL = "https://d1a8sno49hnlhc.cloudfront.net";
const FALLBACK_DEVELOPMENT_URL = "http://localhost:3000";

/**
 * Routes reachable without a session. Everything else sits behind the role
 * guard, so it is kept out of the sitemap and disallowed for crawlers.
 */
export const PUBLIC_ROUTES = ["/", "/about"] as const;

/**
 * Public but deliberately unindexed: thin auth pages that would only add noise
 * to search results.
 */
export const UNINDEXED_PUBLIC_ROUTES = ["/login", "/register"] as const;

/** Behind authentication. Never crawled, never listed. */
export const PRIVATE_ROUTES = ["/dashboard", "/lab", "/workshops", "/print", "/centres", "/deliveries", "/library", "/api"] as const;

export function resolveSiteUrl(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const configured = env.SITE_URL?.trim();
  if (configured) {
    try {
      // Normalise away a trailing slash so joins never double up.
      return new URL(configured).origin;
    } catch {
      // An unparsable value must not take down rendering; fall through.
    }
  }
  return env.NODE_ENV === "production" ? FALLBACK_PRODUCTION_URL : FALLBACK_DEVELOPMENT_URL;
}

export function absoluteUrl(
  path: string,
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  return new URL(path, resolveSiteUrl(env)).toString();
}
