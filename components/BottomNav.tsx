"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PenTool, BarChart2, Users, User, CalendarDays } from "lucide-react";
import { supabase } from "../lib/supabase";
import { calculateLevel } from "../lib/levels";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [badges, setBadges] = useState<Record<string, boolean>>({});

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

  // バッジチェック: Supabase から情報を取得して各タブにバッジを出すか判定
  const refreshBadges = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const uid = user.id;
      const b: Record<string, boolean> = {};

      // 1. マイページ: レベルアップしているかチェック
      try {
        const key = `last_seen_level_${uid}`;
        const raw = localStorage.getItem(key);
        const storedLevel = raw === null ? NaN : Number(raw);
        const { data: logs } = await supabase
          .from('study_logs')
          .select('duration_minutes')
          .eq('student_id', uid);
        if (logs) {
          const total = logs.reduce((s: number, l: any) => s + l.duration_minutes, 0);
          const currentLevel = calculateLevel(total);
          if (isNaN(storedLevel)) {
            // この端末で未記録なら、現在のレベルを基準として保存（初回に赤点が出ないように）
            localStorage.setItem(key, String(currentLevel));
          } else if (currentLevel > storedLevel) {
            b["/mypage"] = true;
          }
        }
      } catch {}

      // 2. カレンダー: 今日の予定・Todoがあるかチェック
      try {
        const today = new Date().toISOString().split('T')[0];
        const seen = localStorage.getItem(`badge_calendar_seen_${uid}`);
        if (seen !== today) {
          const { count } = await supabase
            .from('calendar_events')
            .select('id', { count: 'exact', head: true })
            .eq('student_id', uid)
            .eq('date', today);
          if (count && count > 0) b["/calendar"] = true;
        }
      } catch {}

      // 3. ルーム: 新着メッセージがあるかチェック
      try {
        const { data: memberships } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', uid);
        if (memberships && memberships.length > 0) {
          const roomIds = memberships.map((m: any) => m.group_id);
          const lastSeen = localStorage.getItem(`rooms_badge_seen_${uid}`);
          const { data: msgs } = await supabase
            .from('messages')
            .select('created_at')
            .in('room_id', roomIds)
            .neq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(1);
          if (msgs && msgs.length > 0 && (!lastSeen || msgs[0].created_at > lastSeen)) {
            b["/rooms"] = true;
          }
        }
      } catch {}

      setBadges(b);
    } catch {}
  }, []);

  useEffect(() => {
    refreshBadges();
    window.addEventListener('badgeChanged', refreshBadges);
    return () => window.removeEventListener('badgeChanged', refreshBadges);
  }, [refreshBadges]);

 // 🌟 この行を探して、"/viewer" を追加してください
  if (pathname === "/timer" || pathname === "/nfc-setup" || pathname === "/login" || pathname.startsWith("/viewer")) {
    return null;
  }

  // 🌟 カレンダーを左から3番目に追加（合計5つのメニュー）
  const navItems = [
    { name: "記録", path: "/home", icon: PenTool },
    { name: "レポート", path: "/report", icon: BarChart2 },
    { name: "カレンダー", path: "/calendar", icon: CalendarDays },
    { name: "ルーム", path: "/rooms", icon: Users },
    { name: "マイページ", path: "/mypage", icon: User },
  ];

  return (
    <nav className={`fixed bottom-0 w-full border-t flex justify-around items-center h-20 pb-safe z-50 transition-colors duration-300 ${isDarkMode ? 'bg-[#1c1c1e] border-[#2c2c2e]' : 'bg-white border-slate-200'}`}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.path || (item.path === "/rooms" && pathname.startsWith("/rooms/"));
        // そのページを見ている間はバッジを非表示にする
        const showBadge = !!badges[item.path] && !isActive;

        return (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className="flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-transform"
          >
            <div className="relative">
              <Icon className={`w-6 h-6 transition-colors ${isActive ? 'text-indigo-600' : isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
              {showBadge && (
                <span className={`absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 ${isDarkMode ? 'border-[#1c1c1e]' : 'border-white'}`} />
              )}
            </div>
            <span className={`text-[10px] font-bold ${isActive ? 'text-indigo-600' : isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {item.name}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
