// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import ClientWrapper from '@/components/ClientWrapper';
import GlobalSidebar from '@/components/GlobalSidebar';

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
    <html lang="ja" suppressHydrationWarning> {/* 🌟 属性の微細な違いを無視する魔法の言葉 */}
      <body suppressHydrationWarning>
        <ClientWrapper>
          <div className="flex min-h-screen">
            <main className="flex-1 relative overflow-hidden">
              {children}
            </main>
            {/* サイドバー */}
            <GlobalSidebar />
          </div>
        </ClientWrapper>
      </body>
    </html>
  );
}