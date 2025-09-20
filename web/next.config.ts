import path from "path";
import type { NextConfig } from "next";

const turbopackRoot = path.resolve(__dirname, "..");
console.info("[next-config] turbopack.root:", turbopackRoot);

const nextConfig: NextConfig = {
  turbopack: {
    root: turbopackRoot,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        child_process: false,
      };
    }
    return config;
  },
};

export default nextConfig;
