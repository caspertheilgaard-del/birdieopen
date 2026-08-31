import type { MetadataRoute } from "next";

/** Installable on a phone, so the score card is one tap away on the course. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Birdie Open",
    short_name: "Birdie Open",
    description: "Livescore, stilling og birdieliste for Birdie Open.",
    start_url: "/live",
    display: "standalone",
    background_color: "#f3f1e9",
    theme_color: "#0a281c",
    lang: "da",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
