import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "http://100.68.25.79:3500",
    "http://192.168.0.25:3500",
  ],
};

export default nextConfig;
