"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => setIsDarkMode(localStorage.getItem('dark_mode') === 'true');
    checkDarkMode();
    
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) router.push("/");
    }
    checkUser();
  }, [router]);

  const handleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        scopes: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
      },
    });
    if (error) {
      alert("ログインに失敗しました: " + error.message);
      setIsLoading(false);
    }
  };

  const bgPage = isDarkMode ? "bg-[#0a0a0a] text-slate-100" : "bg-slate-50 text-slate-900";

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 transition-colors duration-300 overflow-hidden ${bgPage}`}>
      <div className={`w-full max-w-sm p-10 rounded-[2.5rem] shadow-xl text-center relative ${isDarkMode ? 'bg-[#1c1c1e] shadow-black/50' : 'bg-white shadow-slate-200'}`}>
        
        {/* アイコン（小） */}
        <div className="flex justify-center mb-4">
          <img src="/icon.png" alt="Mercury Icon" className="w-16 h-16 rounded-full shadow-md border-2 border-slate-100 opacity-80" />
        </div>

        {/* 🌟 修正ポイント：overflow-hidden を削除し、py-4（上下の余白）を追加！ */}
        <div className="flex justify-center mb-6 py-4 pointer-events-none">
          <video
            src="/mercury-logo.mp4"
            autoPlay
            loop
            muted
            playsInline
            disablePictureInPicture // 👈 PiPを禁止
            controlsList="nodownload noplaybackrate" // 👈 メニューを非表示
            onContextMenu={(e) => e.preventDefault()} // 👈 右クリックメニューを禁止
            className={`w-64 h-auto scale-125 pointer-events-none ${isDarkMode ? 'invert brightness-150 contrast-125' : ''}`}
          />
        </div> 

        <p className={`text-sm font-bold mb-10 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          学習とタスクを管理するアプリ
        </p>

        {/* ログインボタン */}
        <button 
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black text-lg shadow-lg shadow-indigo-200 active:scale-95 transition-transform flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.84-2.85z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google でログイン
            </>
          )}
        </button>
      </div>
    </div>
  );
}