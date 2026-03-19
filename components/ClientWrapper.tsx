"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import BottomNav from "./BottomNav";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  
  // 🌟 ハイドレーションエラーを確実に防ぐためのフラグ
  const [mounted, setMounted] = useState(false); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [inputCode, setInputCode] = useState("");

  const isRoomDetail = pathname.startsWith("/rooms/") && pathname !== "/rooms";

  // 1. マウントと初期設定をまとめる
  useEffect(() => {
    setMounted(true);
    
    // ダークモードの初期判定
    const savedMode = localStorage.getItem('dark_mode');
    setIsDarkMode(savedMode === 'true');

    // 招待コードの初期判定
    const savedCode = localStorage.getItem("mercury_auth");
    if (savedCode === process.env.NEXT_PUBLIC_INVITATION_CODE) {
      setIsAuthorized(true);
    }

    // サービスワーカーの登録
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('SW registered'))
        .catch((err) => console.log('SW error', err));
    }

    // イベントリスナーの登録
    const checkDarkMode = () => setIsDarkMode(localStorage.getItem('dark_mode') === 'true');
    window.addEventListener('storage', checkDarkMode);
    window.addEventListener('darkModeChanged', checkDarkMode);
    
    return () => {
      window.removeEventListener('storage', checkDarkMode);
      window.removeEventListener('darkModeChanged', checkDarkMode);
    };
  }, []);

  // 2. ユーザー認証のチェック（セッションの監視）
  useEffect(() => {
    if (!mounted) return;

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user && pathname !== "/login") {
        router.push("/login");
      } else {
        setIsLoading(false);
      }
    };

    checkUser();

    // 🌟 セッションが切れた時に自動でログイン画面に飛ばす
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && pathname !== "/login") {
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [mounted, pathname, router]);

  const handleAuth = () => {
    if (inputCode === process.env.NEXT_PUBLIC_INVITATION_CODE) {
      localStorage.setItem("mercury_auth", inputCode);
      setIsAuthorized(true);
    } else {
      alert("招待コードが正しくありません。");
    }
  };

  const showNav = pathname !== "/login" && !isRoomDetail;

  // 🌟 サーバーとクライアントの不一致を完全に防ぐ
  if (!mounted) return null;

  // 招待コード未入力の場合
  if (!isAuthorized) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center p-6 ${isDarkMode ? 'bg-[#0a0a0a] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className={`w-full max-w-sm p-8 rounded-[2rem] shadow-xl text-center ${isDarkMode ? 'bg-[#1c1c1e] shadow-black/50' : 'bg-white shadow-slate-200'}`}>
          <h1 className="text-2xl font-black mb-2">Mercury 🪐</h1>
          <p className={`text-sm font-bold mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>招待制の限定公開中です。</p>
          <input 
            type="text" 
            placeholder="招待コードを入力"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            className={`w-full p-4 rounded-xl border-2 mb-4 text-center font-bold outline-none ${isDarkMode ? 'bg-[#2c2c2e] border-[#38383a]' : 'bg-slate-50 border-slate-100'}`}
          />
          <button onClick={handleAuth} className="w-full bg-indigo-600 text-white p-4 rounded-xl font-black shadow-lg">アプリに入る</button>
        </div>
      </div>
    );
  }

  // メインコンテンツ
  return (
    <div className={`${isDarkMode ? 'bg-[#0a0a0a] text-slate-100' : 'bg-slate-50 text-slate-900'} ${isRoomDetail ? '' : 'pb-20'} transition-colors duration-300 min-h-screen`}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen font-black tracking-widest opacity-40">LOADING...</div>
      ) : (
        <>
          {children}
          {showNav && <BottomNav />}
        </>
      )}
    </div>
  );
}