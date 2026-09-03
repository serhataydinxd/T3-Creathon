import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/server/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Kaynak duyarlı atölye asistanı`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    lang: "tr",
    dir: "ltr",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f4ee",
    theme_color: "#112e26",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
