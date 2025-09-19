import path from "path";
import type { NextConfig } from "next";

const resolvedRoot = path.resolve(__dirname);
console.info("[next-config] turbopack.root:", resolvedRoot);

const nextConfig: NextConfig = {
  turbopack: {
    root: resolvedRoot,
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
