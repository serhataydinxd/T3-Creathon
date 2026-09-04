import type { MetadataRoute } from "next";
import { CONTENT_UPDATED_ON, PUBLIC_ROUTES, absoluteUrl } from "@/server/site";

// Only the two pages a visitor can actually read without an account. Listing
// the auth pages or the guarded workflow would advertise routes that answer
// with a redirect.
const PRIORITY: Record<string, number> = { "/": 1, "/about": 0.8 };

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(CONTENT_UPDATED_ON);
  return PUBLIC_ROUTES.map((route) => ({
    url: absoluteUrl(route),
    lastModified,
    changeFrequency: "monthly" as const,
    priority: PRIORITY[route] ?? 0.5,
  }));
}
