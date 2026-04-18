"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import BottomNav from "./BottomNav";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState<any>(null);

  const isRoomDetail = pathname.startsWith("/rooms/") && pathname !== "/rooms";

  // 1. マウントと初期設定
  useEffect(() => {
    setMounted(true);
    
    const savedMode = localStorage.getItem('dark_mode');
    setIsDarkMode(savedMode === 'true');

    const checkDarkMode = () => setIsDarkMode(localStorage.getItem('dark_mode') === 'true');
    window.addEventListener('storage', checkDarkMode);
    window.addEventListener('darkModeChanged', checkDarkMode);
    
    return () => {
      window.removeEventListener('storage', checkDarkMode);
      window.removeEventListener('darkModeChanged', checkDarkMode);
    };
  }, []);

  // 2. ユーザー認証チェック（一度だけ実行）
  useEffect(() => {
    if (!mounted) return;

    let isSubscribed = true;

    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (isSubscribed) {
          setUser(session?.user || null);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    checkUser();

    return () => {
      isSubscribed = false;
    };
  }, [mounted]); // mounted のみ依存配列に

  // 3. 認証リスナーの設定
  useEffect(() => {
    if (!mounted) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [mounted]);

  const showNav = pathname !== "/login" && !isRoomDetail && !pathname.startsWith("/viewer");

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="text-indigo-500 font-black animate-pulse tracking-widest">
          SYSTEM INITIALIZING...
        </div>
      </div>
    );
  }

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