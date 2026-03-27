"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation"; 
import { supabase } from "../lib/supabase";
import { User, X, QrCode, Moon, Sun, Bell, PenLine, Share2, Trash2, Shield 
 } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';

export default function GlobalSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userName, setUserName] = useState("ユーザー");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userColor, setUserColor] = useState("bg-blue-500");
  const [userGoal, setUserGoal] = useState("TOEFL 100+ GOAL");
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [myUserId, setMyUserId] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);
  const [showGlobalReminders, setShowGlobalReminders] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
const [isAdmin, setIsAdmin] = useState(false); // ←これを追加！
  const [sidebarOffset, setSidebarOffset] = useState(0);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const sidebarStartX = useRef<number | null>(null);

  // 🌟 ローカルストレージではなく、DBから取得するためのState
  const [reminders, setReminders] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);

  useEffect(() => {
    const handleOpen = () => setShowProfileMenu(true);
    window.addEventListener('openSidebar', handleOpen);

    const checkDarkMode = () => setIsDarkMode(localStorage.getItem('dark_mode') === 'true');
    checkDarkMode();
    window.addEventListener('darkModeChanged', checkDarkMode);

    const savedGoal = localStorage.getItem('user_goal');
    if (savedGoal) setUserGoal(savedGoal);

    fetchProfile();
    fetchReminders(); // 🌟 初期ロード時にDBからリマインダーを取得
    
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);

    return () => {
      window.removeEventListener('openSidebar', handleOpen);
      window.removeEventListener('darkModeChanged', checkDarkMode);
      clearInterval(timer);
    };
  }, []);
  
  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setMyUserId(user.id);

    const { data: profile } = await supabase.from('profiles').select('*, role').eq('id', user.id).single();
    if (profile) {
      console.log("🌟 現在のプロフィールデータ:", profile);
      setUserName(profile.nickname || profile.name || "ユーザー");
      const rawAvatar = profile.avatar_url || "";
      if (rawAvatar.startsWith("bg-")) setUserColor(rawAvatar);
      else if (rawAvatar.trim() !== "") setUserAvatar(rawAvatar);
      // 🌟 追加：データベースのroleが 'admin' なら true にする
      setIsAdmin(profile.role === 'admin');
    }

    const { count: followers } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', user.id);
      
    const { count: following } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', user.id);

    if (followers !== null) setFollowerCount(followers);
    if (following !== null) setFollowingCount(following);
  };

  // 🌟 DBからカレンダーと同じリマインダー情報を取得する関数
  const fetchReminders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: activeReminders } = await supabase.from('reminders').select('*').eq('student_id', user.id);
    const { data: activeEvents } = await supabase.from('calendar_events').select('*').eq('student_id', user.id).not('notify_time', 'is', null).eq('is_completed', false);

    if (activeReminders) setReminders(activeReminders);
    if (activeEvents) setCalendarEvents(activeEvents);
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('dark_mode', newMode.toString());
    document.body.style.backgroundColor = newMode ? '#0a0a0a' : '#f8fafc';
    window.dispatchEvent(new Event('darkModeChanged'));
  };

  const handleEdgeTouchStart = (e: React.TouchEvent) => {
    sidebarStartX.current = e.touches[0].clientX;
    setIsDraggingSidebar(true);
  };
  const handleEdgeTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingSidebar || sidebarStartX.current === null) return;
    const diffX = e.touches[0].clientX - sidebarStartX.current;
    if (!showProfileMenu && diffX > 0 && diffX < 300) setSidebarOffset(diffX);
    if (showProfileMenu && diffX < 0) setSidebarOffset(diffX);
  };
  const handleEdgeTouchEnd = () => {
    setIsDraggingSidebar(false);
    if (!showProfileMenu && sidebarOffset > 80) setShowProfileMenu(true);
    if (showProfileMenu && sidebarOffset < -100) setShowProfileMenu(false);
    setSidebarOffset(0);
    sidebarStartX.current = null;
  };

  const handleShareApp = async () => {
    const shareData = {
      title: 'Mercury',
      text: '学習とタスクを管理するアプリ「Mercury」を一緒に使おう！',
      url: 'https://study-tracker-rzbj.vercel.app', 
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('共有がキャンセルされたか失敗しました', error);
      }
    } else {
      navigator.clipboard.writeText(shareData.url);
      alert("アプリのURLをコピーしました！"); 
    }
  };

  // 🌟 カレンダー側の削除ロジックと統一
  const handleDeleteReminder = async (item: any) => {
    if (item.type === 'reminder') {
      await supabase.from('reminders').delete().eq('id', item.rawId);
      setReminders(prev => prev.filter(r => r.id !== item.rawId));
    } else {
      await supabase.from('calendar_events').update({ notify_time: null }).eq('id', item.rawId);
      setCalendarEvents(prev => prev.map(e => e.id === item.rawId ? { ...e, notify_time: null } : e));
    }
  };

  // 🌟 「あと〇時間」のクールな表示用ヘルパー
  const getCountdownDisplay = (isoStr: string) => {
    const target = new Date(isoStr);
    if (isNaN(target.getTime())) return "";
    const diffMs = target.getTime() - currentTime.getTime();
    if (diffMs <= 0) return `時間です！`;
    const diffMins = Math.floor(diffMs / 60000);
    const d = Math.floor(diffMins / (24 * 60));
    const hours = Math.floor((diffMins % (24 * 60)) / 60);
    const mins = diffMins % 60;
    if (d > 0) return `あと${d}日${hours > 0 ? `${hours}時間` : ''}`;
    if (hours > 0) return `あと${hours}時間${mins > 0 ? `${mins}分` : ''}`;
    return `あと${mins}分`;
  };

  const textMain = isDarkMode ? "text-white" : "text-slate-800";
  const bgSubCard = isDarkMode ? "bg-[#2c2c2e] border-[#38383a]" : "bg-slate-50 border-slate-100";
  const profileUrl = typeof window !== 'undefined' && myUserId ? `${window.location.origin}/user/${myUserId}` : ""; 

  if (pathname?.startsWith('/viewer')) {
    return null; 
  }

  return (
    <div className="z-[9999]">
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-md z-[100] transition-opacity duration-300 ${showProfileMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setShowProfileMenu(false)}
      ></div>
        
      <div 
        onTouchStart={handleEdgeTouchStart}
        onTouchMove={handleEdgeTouchMove}
        onTouchEnd={handleEdgeTouchEnd}
        style={{ 
          transform: showProfileMenu ? `translateX(${sidebarOffset}px)` : `translateX(calc(-100% + ${sidebarOffset}px))`,
          transition: isDraggingSidebar ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}
        className={`fixed top-0 left-0 bottom-0 w-[80%] max-w-[300px] z-[101] shadow-2xl flex flex-col rounded-r-[2.5rem] overflow-hidden ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'}`}
      >
        <div className="p-8 bg-gradient-to-br from-indigo-600 to-blue-800 text-white relative shrink-0">
          <button onClick={() => setShowProfileMenu(false)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X className="w-4 h-4" /></button>
          
          <button 
            onClick={() => { setShowProfileMenu(false); router.push('/mypage'); }}
            className={`w-16 h-16 ${userColor?.startsWith('bg-') ? userColor : ''} hover:opacity-80 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-indigo-900/40 overflow-hidden shrink-0 transition-all active:scale-95`}
            style={!userColor?.startsWith('bg-') ? { backgroundColor: userColor || '#3b82f6' } : {}}
          >
            {userAvatar && userAvatar.trim() !== "" ? (
              <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; setUserAvatar(null); }} />
            ) : (
              <span className="text-3xl font-black text-white">{userName ? userName.charAt(0).toUpperCase() : <User className="w-8 h-8" />}</span>
            )}
          </button>
          
          <h2 className="text-xl font-black leading-tight line-clamp-1">{userName}</h2>
          
          <div className="mt-4 px-1">
            <p className="text-[10px] font-black text-white/50 mb-2 tracking-[0.2em] uppercase">Current Goal</p>
            <div className="relative group">
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/100 pointer-events-none"><PenLine className="w-3.5 h-3.5" /></div>
              <input
                type="text"
                value={userGoal}
                onChange={(e) => { setUserGoal(e.target.value); localStorage.setItem('user_goal', e.target.value); }}
                placeholder="目標を入力..."
                className={`w-full py-3 px-4 pr-10 rounded-2xl text-xs font-black uppercase tracking-widest outline-none transition-all ${isDarkMode ? 'bg-black/20 border border-white/10 focus:border-indigo-500/50 text-white' : 'bg-white/10 border border-white/20 focus:border-white/50 text-white'} placeholder:text-white/30`}
              />
            </div>
          </div>

          <div className="flex gap-6 mt-6 pt-5 border-t border-white/20 px-2">
             <button 
               onClick={() => { setShowProfileMenu(false); router.push('/network?tab=followers'); }} 
               className="flex flex-col items-center hover:opacity-80 transition-opacity active:scale-95"
             >
               <span className="font-black text-white text-xl">{followerCount}</span> 
               <span className="text-[10px] font-bold tracking-widest text-indigo-200 uppercase mt-0.5">Followers</span>
             </button>
             <button 
               onClick={() => { setShowProfileMenu(false); router.push('/network?tab=following'); }} 
               className="flex flex-col items-center hover:opacity-80 transition-opacity active:scale-95"
             >
               <span className="font-black text-white text-xl">{followingCount}</span> 
               <span className="text-[10px] font-bold tracking-widest text-indigo-200 uppercase mt-0.5">Following</span>
             </button>
          </div>
        </div> 
        
        <div className="flex-grow p-6 overflow-y-auto"> 
          <div className="space-y-1">
            <div className="text-[10px] font-black text-slate-400 mb-4 tracking-[0.2em] uppercase px-2">Essential Tools</div>
            <button onClick={toggleDarkMode} className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all group ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-indigo-50'}`}>
              <div className="flex items-center gap-4">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300">
                  {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
                </div>
                <span className={`text-sm font-black ${textMain}`}>ダークモード</span>
              </div>
            </button>
            <button onClick={() => { setShowQrModal(true); setShowProfileMenu(false); }} className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all group ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-indigo-50'}`}>
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400"><QrCode className="w-5 h-5" /></div>
                <span className={`text-sm font-black ${textMain}`}>マイQRコード</span>
              </div>
            </button>
            <button 
              onClick={() => { fetchReminders(); setShowGlobalReminders(true); setShowProfileMenu(false); }} // 🌟 毎回DBから最新状態を読み込む
              className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all group ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-indigo-50'}`}
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400"><Bell className="w-5 h-5" /></div>
                <span className={`text-sm font-black ${textMain}`}>リマインダー確認</span>
              </div>
            </button>
          </div>
          <button onClick={() => { handleShareApp(); setShowProfileMenu(false); }} className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all group mt-1 ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-indigo-50'}`}>
              <div className="flex items-center gap-4">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <Share2 className="w-5 h-5" />
                </div>
                <span className={`text-sm font-black ${textMain}`}>アプリをシェアする</span>
              </div>
            </button>
            {/* 🌟 ここから追加：管理者専用メニュー */}
            {isAdmin && (
              <>
                <div className="text-[10px] font-black text-red-500/70 mb-2 mt-6 tracking-[0.2em] uppercase px-2">Owner Dashboard</div>
                <button 
                  onClick={() => { setShowProfileMenu(false); router.push('/admin'); }} 
                  className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all group border ${isDarkMode ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20' : 'bg-red-50 hover:bg-red-100 border-red-200'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-xl text-red-600 dark:text-red-400">
                      <Shield className="w-5 h-5" />
                    </div>
                    <span className={`text-sm font-black text-red-600 dark:text-red-400`}>管理者ダッシュボード</span>
                  </div>
                </button>
              </>
            )}
            {/* 🌟 追加ここまで */}
        </div> 
      </div> 

      {!showProfileMenu && (
        <div 
          onTouchStart={handleEdgeTouchStart}
          onTouchMove={handleEdgeTouchMove}
          onTouchEnd={handleEdgeTouchEnd}
          className="fixed top-0 left-0 bottom-0 w-5 z-[90]" 
        />
      )}

      {/* QRモーダル */}
      {showQrModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300]" onClick={() => setShowQrModal(false)}></div>
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[301] w-[85%] max-w-sm ${isDarkMode ? 'bg-[#2c2c2e]' : 'bg-white'} rounded-[2.5rem] shadow-2xl p-8 flex flex-col items-center animate-in zoom-in-95 fade-in duration-300`}>
            <button onClick={() => setShowQrModal(false)} className={`absolute top-4 right-4 p-2 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}><X className="w-5 h-5" /></button>
            <h3 className={`text-lg font-black mb-6 ${textMain}`}>プロフィールQR</h3>
            <div className={`p-6 rounded-[2rem] shadow-sm border mb-6 flex flex-col items-center ${isDarkMode ? 'bg-white border-transparent' : 'bg-white border-slate-100'}`}>
              {profileUrl && (
                <QRCodeSVG 
                  value={profileUrl} 
                  size={200} 
                  bgColor={"#ffffff"} 
                  fgColor={"#4f46e5"} 
                  level={"H"} 
                  imageSettings={{
                    src: "/logo.png",
                    height: 50,
                    width: 50,
                    excavate: true,
                  }}
                />
              )}
              <p className="text-[10px] font-black text-indigo-500 mt-4 tracking-widest uppercase">SCAN TO CONNECT</p>
            </div>
          </div>
        </>
      )}

      {/* 🌟 統合されたリマインダー確認モーダル */}
      {showGlobalReminders && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] animate-in fade-in duration-200" onClick={() => setShowGlobalReminders(false)}></div>
          <div className={`fixed top-24 right-4 w-[85%] max-w-xs ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'} z-[201] rounded-3xl p-6 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300`}>
            <div className={`flex justify-between items-center mb-4 border-b pb-4 ${isDarkMode ? 'border-[#38383a]' : 'border-slate-100'}`}>
              <h3 className={`text-sm font-black flex items-center gap-2 ${textMain}`}><Bell className="w-4 h-4 text-indigo-500"/> 設定中のリマインダー</h3>
              <button onClick={() => setShowGlobalReminders(false)} className={`p-1 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}><X className="w-4 h-4" /></button>
            </div>
            
            {(() => {
              // 🌟 カレンダー画面と同じ形式でデータを合成・ソートする
              const allDisplayReminders = [
                ...reminders.map(r => ({ id: `rem_${r.id}`, rawId: r.id, title: r.title, time: r.remind_at, type: 'reminder' })),
                ...calendarEvents.filter(e => e.notify_time && !e.is_completed).map(e => ({ id: `ev_${e.id}`, rawId: e.id, title: e.title, time: e.notify_time as string, type: 'event' }))
              ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

              return allDisplayReminders.length === 0 ? (
                <p className="text-xs font-bold text-slate-400 text-center py-6">現在設定されているリマインダーはありません</p>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {allDisplayReminders.map((rem) => (
                    <div key={rem.id} className={`flex items-center justify-between p-3 rounded-2xl border mb-2 ${bgSubCard}`}>
                       <div className="flex-1 pr-2">
                         <p className={`text-xs font-black line-clamp-1 mb-1 ${textMain}`}>{rem.title}</p>
                         <p className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 inline-block px-2 py-0.5 rounded-md">
                           {getCountdownDisplay(rem.time)}
                         </p>
                       </div>
                       <button onClick={() => handleDeleteReminder(rem)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-full transition-colors shrink-0">
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  ))}
                </div>
              );
            })()}

          </div>
        </>
      )}
    </div>
  );
}