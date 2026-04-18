// next.config.ts
// @ts-ignore
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development', // 開発環境では無効化
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  reactStrictMode: process.env.NODE_ENV === 'production', // 本番環境のみ有効
  serverExternalPackages: ['canvas'],
  
  webpack: (config: any) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default withPWA(nextConfig);