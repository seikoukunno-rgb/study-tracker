"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PenTool, BarChart2, Users, User, CalendarDays, } from "lucide-react";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(localStorage.getItem('dark_mode') === 'true');
    };
    checkDarkMode();
    window.addEventListener('storage', checkDarkMode);
    window.addEventListener('darkModeChanged', checkDarkMode);
    return () => {
      window.removeEventListener('storage', checkDarkMode);
      window.removeEventListener('darkModeChanged', checkDarkMode);
    };
  }, []);

 // 🌟 この行を探して、"/viewer" を追加してください
  if (pathname === "/timer" || pathname === "/nfc-setup" || pathname === "/login" || pathname.startsWith("/viewer")) {
    return null;
  }

  // 🌟 カレンダーを左から3番目に追加（合計5つのメニュー）
  const navItems = [
    { name: "記録", path: "/", icon: PenTool },
    { name: "レポート", path: "/report", icon: BarChart2 },
    { name: "カレンダー", path: "/calendar", icon: CalendarDays },
    { name: "ルーム", path: "/rooms", icon: Users },
    { name: "マイページ", path: "/mypage", icon: User },
  ];

  return (
    <nav className={`fixed bottom-0 w-full border-t flex justify-around items-center h-20 pb-safe z-50 transition-colors duration-300 ${isDarkMode ? 'bg-[#1c1c1e] border-[#2c2c2e]' : 'bg-white border-slate-200'}`}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.path;
        
        return (
          <button 
            key={item.path} 
            onClick={() => router.push(item.path)} 
            className="flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-transform"
          >
            <Icon className={`w-6 h-6 transition-colors ${isActive ? 'text-indigo-600' : isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            <span className={`text-[10px] font-bold ${isActive ? 'text-indigo-600' : isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {item.name}
            </span>
          </button>
        );
      })}
    </nav>
  );
}