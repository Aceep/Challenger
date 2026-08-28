import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: lets phones on the LAN load the client bundle from `next dev`.
  allowedDevOrigins: ["192.168.1.20", "192.168.1.*"],
};

export default nextConfig;
