import type { MetadataRoute } from "next";
import { PRIVATE_ROUTES, absoluteUrl } from "@/server/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The workflow lives behind a role guard, so crawling it only produces
        // redirects to the login page.
        disallow: PRIVATE_ROUTES.map((route) => `${route}/`),
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
