import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: [
    "100.68.25.79",
    "192.168.0.25",
  ],
};

export default nextConfig;
