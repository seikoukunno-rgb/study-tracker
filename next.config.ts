// next.config.ts
// @ts-ignore
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: false, // 🌟 開発中でも一旦生成するようにする
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['canvas'],
  
  // 🌟 Turbopackの設定を削除（またはコメントアウト）
  // turbopack: {}, 

  webpack: (config: any) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default withPWA(nextConfig);