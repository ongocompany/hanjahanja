import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: [
    "100.68.25.79",
    "192.168.0.25",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },  // Google
      { protocol: "https", hostname: "k.kakaocdn.net" },             // Kakao
      { protocol: "https", hostname: "t1.kakaocdn.net" },            // Kakao
      { protocol: "https", hostname: "phinf.pstatic.net" },          // Naver
    ],
  },
};

export default nextConfig;
