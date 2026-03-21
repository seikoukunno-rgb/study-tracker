"use client";

import { useState, useEffect, useRef } from "react";
import { Users, Plus, KeyRound, ChevronRight, X, Loader2, Copy, CheckCircle2, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // モーダル管理用
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // 入力フォーム用
  const [newRoomName, setNewRoomName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // ホストの設定用State
  const [isRankingEnabled, setIsRankingEnabled] = useState(true);
  const [isChatEnabled, setIsChatEnabled] = useState(true);

  // 🌟 ダークモード用のステートを追加
  const [isDarkMode, setIsDarkMode] = useState(false);

const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [sidebarOffset, setSidebarOffset] = useState(0);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const sidebarStartX = useRef<number | null>(null);

  const handleSidebarMenuTouchStart = (e: React.TouchEvent) => { sidebarStartX.current = e.touches[0].clientX; setIsDraggingSidebar(true); };
  const handleSidebarMenuTouchMove = (e: React.TouchEvent) => { if (!isDraggingSidebar || sidebarStartX.current === null) return; const diffX = e.touches[0].clientX - sidebarStartX.current; if (diffX < 0) setSidebarOffset(diffX); };
  const handleSidebarMenuTouchEnd = () => { setIsDraggingSidebar(false); if (sidebarOffset < -100) setShowProfileMenu(false); setSidebarOffset(0); sidebarStartX.current = null; };

  const handleEdgeTouchStart = (e: React.TouchEvent) => { sidebarStartX.current = e.touches[0].clientX; setIsDraggingSidebar(true); };
  const handleEdgeTouchMove = (e: React.TouchEvent) => { if (!isDraggingSidebar || sidebarStartX.current === null) return; const diffX = e.touches[0].clientX - sidebarStartX.current; if (diffX > 0 && diffX < 300) setSidebarOffset(diffX); };
  const handleEdgeTouchEnd = () => { setIsDraggingSidebar(false); if (sidebarOffset > 80) setShowProfileMenu(true); setSidebarOffset(0); sidebarStartX.current = null; };




  useEffect(() => {
    // 🌟 ダークモードの同期処理
    const checkDarkMode = () => {
      const isDark = localStorage.getItem('dark_mode') === 'true';
      setIsDarkMode(isDark);
      document.body.style.backgroundColor = isDark ? '#0a0a0a' : '#f8fafc';
    };
    checkDarkMode();

    // 他の画面で切り替わった時にも連動させる
    window.addEventListener('storage', checkDarkMode);
    window.addEventListener('darkModeChanged', checkDarkMode);

    fetchRooms();

    return () => {
      window.removeEventListener('storage', checkDarkMode);
      window.removeEventListener('darkModeChanged', checkDarkMode);
    };
  }, []);

  // 1. 自分が参加しているルーム一覧を取得
  const fetchRooms = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from('group_members')
      .select(`
        group_id,
        groups ( id, name, invite_code )
      `)
      .eq('user_id', user.id);

    if (data) {
      const formattedRooms = data.map((item: any) => item.groups).filter(Boolean);
      setRooms(formattedRooms);
    }
    setIsLoading(false);
  };

  // 2. 新しいルームを作成する
  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    setIsProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data: newGroup, error: groupErr } = await supabase
      .from('groups')
      .insert([{ 
        name: newRoomName, 
        invite_code: code, 
        created_by: user.id,
        is_ranking_enabled: isRankingEnabled,
        is_chat_enabled: isChatEnabled
      }])
      .select()
      .single();

    if (groupErr || !newGroup) {
      console.error(groupErr);
      alert("ルームの作成に失敗しました");
      setIsProcessing(false);
      return;
    }

    // メンバー登録
    await supabase.from('group_members').insert([{ group_id: newGroup.id, user_id: user.id }]);

    setShowCreateModal(false);
    setNewRoomName("");
    // リスト更新ではなく、直接作成したルームへ移動
    router.push(`/rooms/${newGroup.id}`);
  };

  // 3. 招待コードでルームに参加する
  const handleJoinRoom = async () => {
    if (!inviteCode.trim()) return;
    setIsProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 一致するルームを探す
    const { data: targetGroup, error: findErr } = await supabase
      .from('groups')
      .select('id, name')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();

    if (findErr || !targetGroup) {
      alert("無効な招待コードです");
      setIsProcessing(false);
      return;
    }

    // 既に参加しているかチェック
    const { data: existingMember } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('group_id', targetGroup.id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      // 既に参加済みなら、そのままルームへ移動
      router.push(`/rooms/${targetGroup.id}`);
      return;
    }

    // 未参加なら新規登録して入室
    const { error: joinErr } = await supabase
      .from('group_members')
      .insert([{ group_id: targetGroup.id, user_id: user.id }]);

    if (joinErr) {
      alert("参加に失敗しました");
      console.error(joinErr);
      setIsProcessing(false);
    } else {
      router.push(`/rooms/${targetGroup.id}`);
    }
  };

  // 🌟 ダークモード用のCSSクラス定義
  const bgPage = isDarkMode ? "bg-[#0a0a0a] text-slate-100" : "bg-slate-50 text-slate-800";
  const bgHeader = isDarkMode ? "bg-[#1c1c1e] border-[#2c2c2e]" : "bg-white/80 border-slate-100";
  const bgCard = isDarkMode ? "bg-[#1c1c1e] border-[#38383a]" : "bg-white border-slate-100";
  const bgSubCard = isDarkMode ? "bg-[#2c2c2e] border-[#38383a]" : "bg-slate-50 border-slate-100";
  const textMain = isDarkMode ? "text-white" : "text-slate-800";
  const textSub = isDarkMode ? "text-slate-400" : "text-slate-500";
  const bgInput = isDarkMode ? "bg-[#2c2c2e] border-[#38383a] text-white focus:border-indigo-500 placeholder-slate-500" : "bg-slate-50 border-slate-200 text-slate-700 focus:border-indigo-500";
  const modalBg = isDarkMode ? "bg-[#1c1c1e]" : "bg-white";

  return (
    <div className={`min-h-screen pb-24 font-sans transition-colors duration-300 ${bgPage}`}>
      <header className={`${bgHeader} backdrop-blur-md shadow-sm px-4 py-5 flex justify-between items-center sticky top-0 z-10 border-b transition-colors duration-300`}>
        <div className="flex items-center gap-2">
          <Users className={`w-6 h-6 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <h1 className={`text-xl font-black ${textMain}`}>ルーム</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 mt-2">
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button onClick={() => setShowCreateModal(true)} className={`p-4 rounded-3xl shadow-sm border flex flex-col items-center justify-center gap-2 hover:shadow-md transition-all active:scale-95 group ${bgCard}`}>
            <div className={`p-3 rounded-full transition-colors ${isDarkMode ? 'bg-indigo-500/20 group-hover:bg-indigo-500/30' : 'bg-indigo-50 group-hover:bg-indigo-100'}`}>
              <Plus className={`w-6 h-6 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            </div>
            <span className={`font-bold text-sm ${textMain}`}>ルームを作る</span>
          </button>

          <button onClick={() => setShowJoinModal(true)} className={`p-4 rounded-3xl shadow-sm border flex flex-col items-center justify-center gap-2 hover:shadow-md transition-all active:scale-95 group ${bgCard}`}>
            <div className={`p-3 rounded-full transition-colors ${isDarkMode ? 'bg-blue-500/20 group-hover:bg-blue-500/30' : 'bg-blue-50 group-hover:bg-blue-100'}`}>
              <KeyRound className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <span className={`font-bold text-sm ${textMain}`}>コードで参加</span>
          </button>
        </div>

        <h2 className={`text-sm font-bold mb-3 px-1 tracking-[0.2em] uppercase ${textSub}`}>参加中のルーム</h2>
        
        {isLoading ? (
          <div className={`text-center py-20 font-bold animate-pulse tracking-[0.3em] ${textSub}`}>LOADING...</div>
        ) : rooms.length === 0 ? (
          <div className={`rounded-[2.5rem] border-2 border-dashed p-10 text-center ${isDarkMode ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-white'}`}>
            <Users className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-slate-600' : 'text-slate-200'}`} />
            <p className={`text-sm font-bold ${textSub}`}>まだルームに参加していません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <button key={room.id} onClick={() => router.push(`/rooms/${room.id}`)} className={`w-full p-5 rounded-[2rem] shadow-sm border flex items-center justify-between hover:shadow-md transition-all active:scale-[0.98] group ${bgCard}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${isDarkMode ? 'bg-indigo-500/20' : 'bg-gradient-to-br from-indigo-100 to-blue-100'}`}>
                    <span className={`font-black text-xl ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{room.name.charAt(0)}</span>
                  </div>
                  <div className="text-left">
                    <h3 className={`text-base font-black ${textMain}`}>{room.name}</h3>
                    <p className={`text-xs font-bold mt-1 ${textSub}`}>
                      コード: <span className={`px-2 py-0.5 rounded-md tracking-wider ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{room.invite_code}</span>
                    </p>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 transition-colors ${isDarkMode ? 'text-slate-600 group-hover:text-indigo-400' : 'text-slate-300 group-hover:text-indigo-400'}`} />
              </button>
            ))}
          </div>
        )}
      </main>

      {/* ルーム作成モーダル */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}></div>
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm rounded-[2.5rem] p-8 shadow-2xl z-[51] animate-in zoom-in-95 fade-in duration-300 ${modalBg}`}>
            <div className="flex justify-between items-center mb-8">
              <h2 className={`text-xl font-black ${textMain}`}>ルームを作成</h2>
              <button onClick={() => setShowCreateModal(false)} className={`p-2 rounded-full ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-400'}`}><X className="w-5 h-5" /></button>
            </div>
            
            <input 
              type="text" 
              value={newRoomName} 
              onChange={(e) => setNewRoomName(e.target.value)} 
              placeholder="ルーム名" 
              className={`w-full border-2 rounded-2xl px-5 py-4 font-bold mb-6 outline-none transition-all ${bgInput}`} 
            />
            
            <div className={`rounded-2xl p-5 mb-8 space-y-4 border ${bgSubCard}`}>
              <label className="flex items-center justify-between cursor-pointer">
                <span className={`text-sm font-bold ${textMain}`}>ランキングを表示</span>
                <input type="checkbox" checked={isRankingEnabled} onChange={(e) => setIsRankingEnabled(e.target.checked)} className="w-5 h-5 accent-indigo-600" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className={`text-sm font-bold ${textMain}`}>チャットを許可</span>
                <input type="checkbox" checked={isChatEnabled} onChange={(e) => setIsChatEnabled(e.target.checked)} className="w-5 h-5 accent-indigo-600" />
              </label>
            </div>

            <button onClick={handleCreateRoom} disabled={isProcessing || !newRoomName.trim()} className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-indigo-500/20 transition-all flex justify-center items-center active:scale-95 disabled:opacity-50">
              {isProcessing ? <Loader2 className="animate-spin" /> : "作成する"}
            </button>
          </div>
        </>
      )}

      {/* ルーム参加モーダル */}
      {showJoinModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowJoinModal(false)}></div>
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm rounded-[2.5rem] p-8 shadow-2xl z-[51] animate-in zoom-in-95 fade-in duration-300 ${modalBg}`}>
            <div className="flex justify-between items-center mb-8">
              <h2 className={`text-xl font-black ${textMain}`}>コードで参加</h2>
              <button onClick={() => setShowJoinModal(false)} className={`p-2 rounded-full ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-400'}`}><X className="w-5 h-5" /></button>
            </div>
            
            <input 
              type="text" 
              value={inviteCode} 
              onChange={(e) => setInviteCode(e.target.value)} 
              placeholder="招待コード" 
              className={`w-full border-2 rounded-2xl px-5 py-5 font-black text-center tracking-[0.3em] uppercase mb-8 outline-none transition-all ${bgInput} focus:border-blue-500`} 
            />
            
            <button onClick={handleJoinRoom} disabled={isProcessing || !inviteCode.trim()} className="w-full bg-blue-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-blue-500/20 transition-all flex justify-center items-center active:scale-95 disabled:opacity-50">
              {isProcessing ? <Loader2 className="animate-spin" /> : "参加する"}
            </button>
          </div>
        </>
      )}
      {/* 🌟 付箋タブ ＆ サイドバー */}
      {!showProfileMenu && (
        <div onTouchStart={handleEdgeTouchStart} onTouchMove={handleEdgeTouchMove} onTouchEnd={handleEdgeTouchEnd} className="fixed top-0 left-0 bottom-0 w-6 z-[90]" />
      )}
      <button
        onClick={() => setShowProfileMenu(true)}
        style={{ transform: showProfileMenu ? 'translateX(-100%)' : 'translateX(0)' }}
        className="fixed left-0 top-32 z-[90] bg-indigo-600 text-white py-4 pl-1 pr-2 rounded-r-2xl shadow-xl flex flex-col items-center justify-center transition-transform duration-300 opacity-95 active:scale-95 border-y border-r border-indigo-400"
      >
        <Menu className="w-5 h-5" />
        <ChevronRight className="w-4 h-4 -ml-1 opacity-60 animate-pulse-horizontal" />
      </button>
      <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] transition-opacity duration-300 ${showProfileMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setShowProfileMenu(false)} />
      <div
        onTouchStart={handleSidebarMenuTouchStart} onTouchMove={handleSidebarMenuTouchMove} onTouchEnd={handleSidebarMenuTouchEnd}
        style={{ transform: showProfileMenu ? `translateX(${sidebarOffset}px)` : `translateX(calc(-100% + ${sidebarOffset}px))`, transition: isDraggingSidebar ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        className={`fixed top-0 left-0 bottom-0 w-[80%] max-w-[300px] z-[401] shadow-2xl flex flex-col rounded-r-[2.5rem] overflow-hidden ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'}`}
      >
        {/* サイドバーの中身（カレンダーのコードと同じものを貼り付け） */}
      </div>
    </div>
    
  );
}