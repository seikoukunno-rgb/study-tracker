"use client";

import { useState, useEffect } from "react";
import { Download, Loader2 } from "lucide-react";

export default function PWAInstallPrompt() {
  const [progress, setProgress] = useState(0); // 🌟 パーセンテージ用
  const [isInstalling, setIsInstalling] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    // Service Worker からの進捗メッセージを受け取る
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'PWA_PROGRESS') {
        setProgress(event.data.progress);
        if (event.data.progress > 0) setIsInstalling(true);
        if (event.data.progress === 100) {
           setTimeout(() => setIsInstalling(false), 2000); // 完了後少しして消す
        }
      }
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (!isInstalling && !installPrompt) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[200] bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-2xl border border-indigo-100 dark:border-slate-700 animate-in slide-in-from-bottom-10">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-end mb-1">
          <h3 className="font-black text-slate-800 dark:text-white">
            {progress === 100 ? "準備完了！" : "アプリを最適化中..."}
          </h3>
          <span className="text-indigo-600 font-black text-xl">{progress}%</span>
        </div>

        {/* 🌟 プログレスバー本体 */}
        <div className="w-full h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-xs text-slate-500 font-bold">
          {progress < 100 
            ? "オフラインでもサクサク動くようにデータを保存しています..." 
            : "インストールボタンを押してホーム画面に追加してください！"}
        </p>

        {progress === 100 && installPrompt && (
          <button
            onClick={() => installPrompt.prompt()}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Download className="w-5 h-5" /> 今すぐインストール
          </button>
        )}
      </div>
    </div>
  );
}