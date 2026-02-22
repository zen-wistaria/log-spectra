import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["bcrypt-ts"],
  experimental: {
    authInterrupts: true,
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
};

export default nextConfig;
