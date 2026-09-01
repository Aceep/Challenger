import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: lets phones on the LAN load the client bundle from `next dev`.
  allowedDevOrigins: ["192.168.1.20", "192.168.1.*"],
  images: {
    // Book covers, and nothing else: the same host `isAllowedCoverUrl` lets through.
    remotePatterns: [{ protocol: "https", hostname: "covers.openlibrary.org", pathname: "/b/id/**" }],
  },
};

export default nextConfig;
