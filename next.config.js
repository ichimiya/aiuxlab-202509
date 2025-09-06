/** @type {import('next').NextConfig} */
const nextConfig = {
  // Webpack設定（Turbopack対応）
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // ブラウザ側でNode.jsモジュールを無効化
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

module.exports = nextConfig;
