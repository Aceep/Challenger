import type { MetadataRoute } from "next";

/**
 * Web app manifest, served at `/manifest.webmanifest`.
 *
 * Next injects the `<link rel="manifest">` by itself — do not also set
 * `metadata.manifest` in the root layout, or the tag ships twice.
 *
 * `start_url` is `/home` rather than `/`: the landing page redirects signed-in
 * players there anyway. Signed out, the proxy sends it to
 * `/login?callbackUrl=/home`, which stays inside `scope`.
 *
 * The icon set is produced by `npm run pwa:icons` from `app/icon.png`; the
 * `maskable` pair carries the safe-area padding Android crops into a circle.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Challenger",
    short_name: "Challenger",
    description:
      "Challenger, par Aceep&Kyle : lance le défi lecture de ta communauté Discord. Chaque page lue rapporte des points ; bingo, quêtes et histoire font le reste.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    lang: "fr",
    background_color: "#fbf8f0",
    theme_color: "#FFD84A",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
