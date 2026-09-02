import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: lets phones on the LAN load the client bundle from `next dev`.
  allowedDevOrigins: ["192.168.1.20", "192.168.1.*"],
  // `@napi-rs/canvas` charge un binaire natif (`.node`) : le bundler doit le
  // laisser en `require` externe, sinon l'image du bingo ne se dessine pas.
  serverExternalPackages: ["@napi-rs/canvas"],
  // La police du bingo n'est désignée par aucun `import` : sans cette ligne,
  // le traçage des fichiers ne l'embarquerait pas dans la fonction déployée et
  // le texte de l'image tomberait en carrés.
  outputFileTracingIncludes: { "/api/discord/interactions": ["./assets/fonts/**"] },
  images: {
    // Book covers, and nothing else: the same host `isAllowedCoverUrl` lets through.
    remotePatterns: [{ protocol: "https", hostname: "covers.openlibrary.org", pathname: "/b/id/**" }],
  },
};

export default nextConfig;
