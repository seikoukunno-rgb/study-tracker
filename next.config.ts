// next.config.ts
import withPWAInit from 'next-pwa';
import defaultRuntimeCaching from 'next-pwa/cache';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development', // 開発環境では無効化
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: ({ url }: { url: URL }) => /^\/api\/(?:drive(?:\/|$)|google-drive(?:\/|$)|auth(?:\/|$)|oauth(?:\/|$)|mcp(?:\/|$))/.test(url.pathname),
      handler: 'NetworkOnly',
    },
    ...defaultRuntimeCaching,
  ],
});

const nextConfig = {
  reactStrictMode: process.env.NODE_ENV === 'production', // 本番環境のみ有効
  serverExternalPackages: ['canvas'],
  
  webpack: (config: any) => {
    config.resolve.alias.canvas = false;
    return config;
  },

  // Claude コネクタ (リモートMCP) の OAuth 検出用
  async rewrites() {
    return [
      { source: '/.well-known/oauth-protected-resource', destination: '/api/oauth/protected-resource' },
      { source: '/.well-known/oauth-protected-resource/:path*', destination: '/api/oauth/protected-resource' },
      { source: '/.well-known/oauth-authorization-server', destination: '/api/oauth/metadata' },
      { source: '/.well-known/oauth-authorization-server/:path*', destination: '/api/oauth/metadata' },
      { source: '/.well-known/openid-configuration', destination: '/api/oauth/metadata' },
    ];
  },
};

export default withPWA(nextConfig);