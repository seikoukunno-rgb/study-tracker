import './globals.css';
import type { Metadata } from 'next';
import ClientWrapper from '@/components/ClientWrapper';
import GlobalSidebar from '@/components/GlobalSidebar';

// 🌟 PWA（アプリ化）に必要な設定。ここは完璧です！
export const metadata: Metadata = {
  title: "Mercury",
  description: "Study Tracker",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mercury",
  },
  icons: [
    { rel: "apple-touch-icon", url: "/icon-192x192.png" },
    { rel: "icon", url: "/icon-192x192.png" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {/* 🌟 修正ポイント：
          GlobalSidebar を ClientWrapper の「中」に移動しました。
          これでサイドバーがアプリのコンテキスト（状態）を正しく共有できるようになります。
        */}
        <ClientWrapper>
          {children}
          
          {/* 🌟 共通サイドバーをここに配置。これで勝手な開閉が止まります */}
          <GlobalSidebar />
        </ClientWrapper>
      </body>
    </html>
  );
}