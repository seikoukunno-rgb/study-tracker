import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Mercury",
  description: "学習とタスクを管理するアプリ",
  manifest: "/manifest.json", // 👈 これを追加
  appleWebApp: {
    capable: true,
    title: "Mercury",
    statusBarStyle: "default",
  },
  themeColor: "#4f46e5",
};