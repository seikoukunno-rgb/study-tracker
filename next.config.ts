// next.config.ts
// @ts-ignore
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  // 開発中のみPWA生成を無効化
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 🌟 修正：Next.js 16 の仕様に合わせて experimental の「外」に出す
  serverExternalPackages: ['canvas'],
  
  // 🌟 修正：Webpack（PWA用）と Turbopack を共存させるための設定
  turbopack: {},

  webpack: (config: any) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default withPWA(nextConfig);