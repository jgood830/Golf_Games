import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Skins Tracker",
    short_name: "Skins",
    description: "Track a golf skins game and closest-to-the-pin, then settle up.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d5c36",
    theme_color: "#0d5c36",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
