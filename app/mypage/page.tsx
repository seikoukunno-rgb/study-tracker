"use client";

import { useState, useEffect } from "react";
import { User, Settings, Loader2, LogOut, CheckCircle2, Flame, Trophy, Clock, ChevronRight, Star, QrCode, Share2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
// 🌟 先ほど作成したレベル計算ファイルをインポート
import { calculateLevel, getLevelStartMinutes, getNextLevelMinutes } from "../../lib/levels";
import { QRCodeSVG } from 'qrcode.react';

const AVATAR_COLORS = [
  "bg-indigo-500", "bg-blue-500", "bg-emerald-500", 
  "bg-amber-500", "bg-rose-500", "bg-purple-500"
];

export default function MyPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  
  // 🌟 ダークモード用のステートを追加
  const [isDarkMode, setIsDarkMode] = useState(false);

  // プロフィール情報
  const [nickname, setNickname] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [showSuccess, setShowSuccess] = useState(false);

  // 学習統計データ
  const [stats, setStats] = useState({ totalMinutes: 0, streak: 0 });
  // 🌟 ここから追加：QRコードとシェア機能用
  const [showQrModal, setShowQrModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
const [myUserId, setMyUserId] = useState(""); // 🌟 これを追加！ // シェアするURL

useEffect(() => {
  const getUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setMyUserId(user.id);
  };
  getUserId();
}, []);

const profileUrl = typeof window !== 'undefined' && myUserId 
  ? `${window.location.origin}/user/${myUserId}` 
  : "";

  const handleShareProfile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Study Tracker Profile',
          text: '私のMercuryのプロフィールを見てね！',
          url: profileUrl,
        });
      } catch (error) {
        console.error('Error sharing', error);
      }
    } else {
      navigator.clipboard.writeText(profileUrl);
      setToastMessage("URLをコピーしました！");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // 🌟 ダークモードの同期
  useEffect(() => {
    const checkDarkMode = () => {
      const savedMode = localStorage.getItem('dark_mode');
      setIsDarkMode(savedMode === 'true');
    };
    checkDarkMode();

    window.addEventListener('storage', checkDarkMode);
    window.addEventListener('darkModeChanged', checkDarkMode);
    return () => {
      window.removeEventListener('storage', checkDarkMode);
      window.removeEventListener('darkModeChanged', checkDarkMode);
    };
  }, []);

  useEffect(() => {
    fetchProfileAndStats();
  }, []);

  const fetchProfileAndStats = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/login");
      return;
    }
    
    setUserEmail(user.email || "");

    // 1. プロフィール情報を取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      setNickname(profile.nickname || "");
      setAvatarColor(profile.avatar_url || AVATAR_COLORS[0]);
    }

    // 2. 学習ログを取得して統計（レベル・ストリーク）を計算
    const { data: logs } = await supabase
      .from('study_logs')
      .select('duration_minutes, studied_at')
      .eq('student_id', user.id)
      .order('studied_at', { ascending: false });

    if (logs && logs.length > 0) {
      // 総学習時間
      const totalMin = logs.reduce((sum, log) => sum + log.duration_minutes, 0);
      
      // ストリーク計算
      let streak = 0;
      const today = new Date().toISOString().split('T')[0];
      const uniqueDates = Array.from(new Set(logs.map(l => l.studied_at)));
      
      let checkDate = new Date();
      if (uniqueDates[0] !== today) {
        checkDate.setDate(checkDate.getDate() - 1); // 今日やってなければ昨日からチェック
      }

      for (let i = 0; i < uniqueDates.length; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (uniqueDates.includes(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      setStats({ totalMinutes: totalMin, streak });
    }
    
    setIsLoading(false);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        id: user.id, 
        nickname: nickname, 
        avatar_url: avatarColor,
        updated_at: new Date().toISOString()
      });

    if (error) {
      alert("保存に失敗しました: " + error.message);
    } else {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
    setIsSaving(false);
  };

  if (isLoading) return <div className={`text-center mt-20 font-bold animate-pulse ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>ステータス同期中...</div>;

  const level = calculateLevel(stats.totalMinutes);
  const currentLevelMin = getLevelStartMinutes(level);
  const nextLevelMin = getNextLevelMinutes(level);
  const progress = ((stats.totalMinutes - currentLevelMin) / (nextLevelMin - currentLevelMin)) * 100;

  // 🌟 ダークモード用のCSS変数
  const bgPage = isDarkMode ? "bg-[#0a0a0a]" : "bg-slate-50";
  const bgCard = isDarkMode ? "bg-[#1c1c1e] border-[#2c2c2e]" : "bg-white border-slate-100";
  const bgSubCard = isDarkMode ? "bg-[#2c2c2e] border-[#38383a]" : "bg-slate-50 border-slate-100";
  const textMain = isDarkMode ? "text-white" : "text-slate-800";
  const textSub = isDarkMode ? "text-slate-400" : "text-slate-400";
  const bgInput = isDarkMode ? "bg-[#2c2c2e] border-[#38383a] text-white placeholder-slate-500 focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-700 focus:border-indigo-500";

  return (
    <div className={`min-h-screen font-sans pb-32 transition-colors duration-300 ${bgPage}`}>
      
      {/* 保存成功トースト */}
      {showSuccess && (
        <div className="fixed top-4 left-4 right-4 z-[100] bg-emerald-600 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top duration-300 max-w-md mx-auto">
          <CheckCircle2 className="w-6 h-6" />
          <span className="font-bold">プロフィールを更新しました！</span>
        </div>
      )}

      {/* ヘッダーエリア：プロフィール表示 */}
      <div className={`px-6 pt-12 pb-10 rounded-b-[3rem] shadow-sm border-b mb-6 transition-colors duration-300 ${bgCard}`}>
        <div className="max-w-md mx-auto flex items-center gap-6">
          <div className={`w-20 h-20 ${avatarColor} rounded-[2rem] flex items-center justify-center shadow-lg transform rotate-3 flex-shrink-0 border-2 ${isDarkMode ? 'border-[#2c2c2e]' : 'border-white'}`}>
            <span className="text-3xl font-black text-white">
              {nickname ? nickname.charAt(0).toUpperCase() : "?"}
            </span>
          </div>
          <div>
            <h1 className={`text-2xl font-black transition-colors ${textMain}`}>{nickname || "ゲスト"}</h1>
            <p className={`text-xs font-bold transition-colors ${textSub}`}>{userEmail}</p>
          </div>
        </div>

        {/* レベルカード (このカードは常にダークトーンでカッコよく表示) */}
        <div className="max-w-md mx-auto mt-8 bg-[#111827] rounded-[2.5rem] p-6 text-white shadow-xl shadow-indigo-900/20">
          <div className="flex justify-between items-end mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-3 h-3 text-amber-400 fill-current" />
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Rank S Student</p>
              </div>
              <h2 className="text-4xl font-black italic">Lv. {level}</h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Next Level</p>
              <p className="text-xs font-black text-indigo-300">{nextLevelMin - stats.totalMinutes} min</p>
            </div>
          </div>
          
          <div className="h-3 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 space-y-6">
        
        {/* 統計クイックビュー */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-5 rounded-3xl shadow-sm border flex flex-col items-center gap-1 transition-colors duration-300 ${bgCard}`}>
            <Flame className={`w-6 h-6 ${stats.streak > 0 ? 'text-orange-500 animate-pulse' : isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
            <p className={`text-[10px] font-black uppercase tracking-widest ${textSub}`}>Streak</p>
            <p className={`text-lg font-black ${textMain}`}>{stats.streak}日連続</p>
          </div>
          <div className={`p-5 rounded-3xl shadow-sm border flex flex-col items-center gap-1 transition-colors duration-300 ${bgCard}`}>
            <Clock className="w-6 h-6 text-blue-500" />
            <p className={`text-[10px] font-black uppercase tracking-widest ${textSub}`}>Total Time</p>
            <p className={`text-lg font-black ${textMain}`}>{stats.totalMinutes}分</p>
          </div>
        </div>

        {/* プロフィール編集 */}
        <section className={`p-6 rounded-[2.5rem] shadow-sm border transition-colors duration-300 ${bgCard}`}>
          <div className={`flex items-center gap-2 mb-6 ${textMain}`}>
            <Settings className="w-5 h-5 text-indigo-500" />
            <h2 className="font-black">プロフィール設定</h2>
          </div>

          <div className="mb-8 flex flex-col items-center">
            <div className={`flex gap-3 p-3 rounded-2xl border transition-colors ${bgSubCard}`}>
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setAvatarColor(color)}
                  className={`w-8 h-8 rounded-xl ${color} border-2 transition-all ${
                    avatarColor === color 
                      ? (isDarkMode ? 'border-white scale-110 shadow-md' : 'border-slate-800 scale-110 shadow-md') 
                      : 'border-transparent hover:scale-105'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className={`block text-[10px] font-black mb-2 ml-1 uppercase tracking-widest ${textSub}`}>Nickname</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="例: たろう"
                className={`w-full border-2 rounded-2xl px-5 py-4 font-bold outline-none transition-colors duration-300 ${bgInput}`}
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={isSaving || !nickname.trim()}
              className={`w-full disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg transition-all flex justify-center items-center active:scale-95 ${isDarkMode ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-slate-900 hover:bg-black'}`}
            >
              {isSaving ? <Loader2 className="animate-spin" /> : "変更を保存する"}
            </button>
          </div>
        </section>
<button
          onClick={() => setShowQrModal(true)}
          className={`w-full flex items-center justify-between p-4 rounded-2xl shadow-sm border transition-all active:scale-95 mb-2 ${bgCard}`}
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400">
              <QrCode className="w-6 h-6" />
            </div>
            <span className={`text-sm font-black ${textMain}`}>マイQRコード / シェア</span>
          </div>
          <ChevronRight className={`w-5 h-5 ${textSub}`} />
        </button>
        {/* ログアウト */}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/login");
          }}
          className={`w-full flex items-center justify-center gap-2 font-bold py-4 rounded-2xl transition-all active:scale-95 mb-10 ${isDarkMode ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-50 hover:bg-rose-100 text-rose-600'}`}
        >
          <LogOut className="w-5 h-5" />
          ログアウト
        </button>

      </main>
      {showQrModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300]" onClick={() => setShowQrModal(false)}></div>
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[301] w-[85%] max-w-sm ${isDarkMode ? 'bg-[#2c2c2e]' : 'bg-white'} rounded-[2.5rem] shadow-2xl p-8 flex flex-col items-center animate-in zoom-in-95 fade-in duration-300`}>
            <button onClick={() => setShowQrModal(false)} className={`absolute top-4 right-4 p-2 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}><X className="w-5 h-5" /></button>
            <h3 className={`text-lg font-black mb-6 ${textMain}`}>プロフィールQR</h3>
            
            <div className={`p-6 rounded-[2rem] shadow-sm border mb-6 flex flex-col items-center ${isDarkMode ? 'bg-white border-transparent' : 'bg-white border-slate-100'}`}>
              {profileUrl ? (
  <QRCodeSVG 
    value={profileUrl} 
    size={200}
    bgColor={"#ffffff"}
    fgColor={"#4f46e5"}
    level={"H"} 
    imageSettings={{
      src: "/logo.png", // 🌟 保存したペンと月のロゴ
      height: 48,
      width: 48,
      excavate: true,
    }}
  />
) : (
  <div className="w-[200px] h-[200px] bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-xs font-bold text-slate-400">
    生成中...
  </div>
)}
              
              <p className="text-[10px] font-black text-indigo-400 mt-4 tracking-widest uppercase">SCAN TO CONNECT</p>
            </div>

            <p className={`text-xs font-bold text-center mb-6 ${textSub}`}>このQRコードをスキャンして<br/>Study Trackerで繋がりましょう！</p>
            
            <button onClick={handleShareProfile} className="w-full py-4 bg-indigo-600 text-white rounded-[2rem] font-black shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all">
              <Share2 className="w-5 h-5"/> リンクをシェア
            </button>
          </div>
        </>
      )}

      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[400] bg-slate-800 text-white px-6 py-3 rounded-full shadow-xl font-bold text-sm animate-in fade-in slide-in-from-bottom-4">
          {toastMessage}
        </div>
      )}
    </div>
  );
}