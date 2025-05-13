// import type { NextConfig } from "next";

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/rate-my-plate/**",
      },
    ],
  },
};

export default nextConfig;
