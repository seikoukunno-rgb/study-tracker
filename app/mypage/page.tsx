"use client";

import { useState, useEffect, useRef } from "react";
import { User, Settings, Loader2, LogOut, CheckCircle2, Flame, Trophy, Clock, ChevronRight, Star, QrCode, Share2, X, Menu, Search, GraduationCap, Briefcase, PencilLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
// 🌟 レベル計算ファイルをインポート
import { calculateLevel, getLevelStartMinutes, getNextLevelMinutes } from "../../lib/levels";
import { QRCodeSVG } from 'qrcode.react';

const AVATAR_COLORS = [
  "bg-indigo-500", "bg-blue-500", "bg-emerald-500", 
  "bg-amber-500", "bg-rose-500", "bg-purple-500"
];

// 🌟 爆速検索用大学リスト（オンボーディング画面と同じ、自由に追加可能）
const UNIVERSITIES = [
  "東京大学", "京都大学", "大阪大学", "北海道大学", "東北大学", "名古屋大学", "九州大学",
  "筑波大学", "神戸大学", "横浜国立大学", "千葉大学", "広島大学", "岡山大学", "金沢大学", "熊本大学",
  "新潟大学", "静岡大学", "東京工業大学", "一橋大学", "東京医科歯科大学", "東京外国語大学", "東京農工大学",
  "お茶の水女子大学", "電気通信大学", "名古屋工業大学", "京都工芸繊維大学", "九州工業大学",
  "慶應義塾大学", "早稲田大学", "上智大学", "東京理科大学", "国際基督教大学",
  "明治大学", "青山学院大学", "立教大学", "中央大学", "法政大学", "学習院大学",
  "関西大学", "関西学院大学", "同志社大学", "立命館大学",
  "日本大学", "東洋大学", "駒澤大学", "専修大学", "近畿大学", "龍谷大学", "甲南大学", "京都産業大学",
  "成蹊大学", "成城大学", "明治学院大学", "國學院大学", "武蔵大学", "獨協大学",
  "芝浦工業大学", "東京電機大学", "工学院大学", "豊洲工業大学", "大阪工業大学",
  "南山大学", "中京大学", "名城大学", "愛知大学", "福岡大学", "西南学院大学",
  "専門学校", "短大" // 自由に追加してください
];

// 🌟 プロフィールのサブ情報（大学や職業）を綺麗に整形する関数（既存）
const getSubProfileText = (profile: any) => {
  if (!profile) return '';
  if (profile.user_type === 'student') {
    const uni = profile.university || '';
    const grade = profile.grade || '';
    return `${uni} ${grade}`.trim() || '学生';
  } else if (profile.user_type === 'worker') {
    return profile.occupation || '社会人・その他';
  }
  return '';
};

export default function MyPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  
  // 🌟 ダークモード用のステート
  const [isDarkMode, setIsDarkMode] = useState(false);

  // プロフィール編集用ステート（全属性に拡張）
  const [nickname, setNickname] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [fullProfile, setFullProfile] = useState<any>(null); // 所属バッジ用

  // 🌟 新規：姓名ステート（保存はreal_nameに結合）
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  // カナはオンボーディングで無視されていたため、マイページでも無視します（不整合防止）
  
  // 🌟 新規：属性ステート
  const [age, setAge] = useState("");
  const [userType, setUserType] = useState('student');
  const [university, setUniversity] = useState("");
  const [grade, setGrade] = useState("");
  const [occupation, setOccupation] = useState("");

  const [showSuccess, setShowSuccess] = useState(false);

  // 学習統計データ
  const [stats, setStats] = useState({ totalMinutes: 0, streak: 0 });
  
  // QRコード/シェア、大学サジェスト
  const [showQrModal, setShowQrModal] = useState(false);
  const [showUniDropdown, setShowUniDropdown] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState("");

  // ==========================================
  // 🌟 共通サイドバー呼び出し処理 (極限までシンプル化)
  // ==========================================
  const sidebarStartX = useRef<number | null>(null);

  const handleEdgeTouchStart = (e: React.TouchEvent) => { 
    sidebarStartX.current = e.touches[0].clientX; 
  };
  const handleEdgeTouchMove = (e: React.TouchEvent) => { 
    if (sidebarStartX.current === null) return;
    const diffX = e.touches[0].clientX - sidebarStartX.current;
    if (diffX > 40) {
      window.dispatchEvent(new Event('openSidebar'));
      sidebarStartX.current = null; 
    }
  };
  const handleEdgeTouchEnd = () => { 
    sidebarStartX.current = null; 
  };
  // ==========================================

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
          text: '私のStudy Trackerのプロフィールを見てね！',
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

  // ダークモードの同期
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

    // 🌟 全属性を取得するように修正 (`profiles.real_name` が姓 名 セイ メイ に対応)
    const { data: profile } = await supabase
      .from('profiles')
      .select('*') // 全カラム取得
      .eq('id', user.id)
      .single();

    if (profile) {
      setNickname(profile.nickname || "");
      setAvatarColor(profile.avatar_url || AVATAR_COLORS[0]);
      setFullProfile(profile); // 所属バッジ用

      // 🌟 姓名の分割（漢字のみ、カナは無視）
      if (profile.real_name) {
        const parts = profile.real_name.split(' ');
        if (parts.length >= 2) {
          setLastName(parts[0]);
          setFirstName(parts.slice(1).join(' ')); // 名前にスペースが含まれる場合の考慮
        } else {
          setLastName(profile.real_name);
          setFirstName("");
        }
      }

      // 🌟 新規属性ステートのセット
      setAge(profile.age || "");
      setUserType(profile.user_type || 'student');
      setUniversity(profile.university || "");
      setGrade(profile.grade || "");
      setOccupation(profile.occupation || "");
    }

    // 学習ログ同期・レベル計算
    const { data: logs } = await supabase
      .from('study_logs')
      .select('duration_minutes, studied_at')
      .eq('student_id', user.id)
      .order('studied_at', { ascending: false });

    if (logs && logs.length > 0) {
      const totalMin = logs.reduce((sum, log) => sum + log.duration_minutes, 0);
      let streak = 0;
      const today = new Date().toISOString().split('T')[0];
      const uniqueDates = Array.from(new Set(logs.map(l => l.studied_at)));
      let checkDate = new Date();
      if (uniqueDates[0] !== today) checkDate.setDate(checkDate.getDate() - 1); 

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

    // 🌟 漢字の姓名を結合
    const fullName = `${lastName} ${firstName}`;

    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        id: user.id, 
        nickname: nickname, 
        avatar_url: avatarColor,
        // 🌟 新規属性を追加（upsert で全カラム保存）
        real_name: fullName,
        age: age,
        user_type: userType,
        university: userType === 'student' ? university : null, // 学生でなければnullに
        grade: userType === 'student' ? grade : null, // 学生でなければnullに
        occupation: userType === 'worker' ? occupation : null, // 社会人でなければnullに
        updated_at: new Date().toISOString()
      });

    if (error) {
      alert("保存に失敗しました: " + error.message);
    } else {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchProfileAndStats(); // 所属バッジなどを更新
    }
    setIsSaving(false);
  };

  // 🌟 爆速フィルター処理（オンボーディング画面と同じ）
  const filteredUnis = university.trim() === '' 
    ? [] 
    : UNIVERSITIES.filter(uni => uni.includes(university)).slice(0, 10);

  if (isLoading) return <div className={`text-center mt-20 font-bold animate-pulse ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>ステータス同期中...</div>;

  const level = calculateLevel(stats.totalMinutes);
  const currentLevelMin = getLevelStartMinutes(level);
  const nextLevelMin = getNextLevelMinutes(level);
  const progress = ((stats.totalMinutes - currentLevelMin) / (nextLevelMin - currentLevelMin)) * 100;

  // ダークモード用CSS
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

      {/* ヘッダーエリア：プロフィール表示（所属バッジ付き） */}
      <div className={`relative px-6 pt-12 pb-10 rounded-b-[3rem] shadow-sm border-b mb-6 transition-colors duration-300 ${bgCard}`}>
        
        {/* メニューボタン */}
        <button onClick={() => window.dispatchEvent(new Event('openSidebar'))} className={`absolute top-6 left-6 p-2 rounded-xl transition-all active:scale-90 ${isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}><Menu className="w-6 h-6" /></button>

        <div className="max-w-md mx-auto flex items-center gap-6 mt-4">
          <div className={`w-20 h-20 ${avatarColor} rounded-[2rem] flex items-center justify-center shadow-lg transform rotate-3 flex-shrink-0 border-2 ${isDarkMode ? 'border-[#2c2c2e]' : 'border-white'}`}>
            <span className="text-3xl font-black text-white">{nickname ? nickname.charAt(0).toUpperCase() : "?"}</span>
          </div>
          <div>
            <h1 className={`text-2xl font-black transition-colors ${textMain}`}>{nickname || "ゲスト"}</h1>
            
            {/* 🌟 ここに所属バッジ（画像と同じ） */}
            {fullProfile && getSubProfileText(fullProfile) && (
              <div className={`inline-block mt-1 px-3 py-1 text-[10px] font-bold rounded-full ${isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
                {getSubProfileText(fullProfile)}
              </div>
            )}
            
            <p className={`text-[10px] font-bold transition-colors mt-1.5 ${textSub}`}>{userEmail}</p>
          </div>
        </div>

        {/* レベルカード */}
        <div className="max-w-md mx-auto mt-8 bg-[#111827] rounded-[2.5rem] p-6 text-white shadow-xl shadow-indigo-900/20">
          <div className="flex justify-between items-end mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1"><Star className="w-3 h-3 text-amber-400 fill-current" /><p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Rank S Student</p></div>
              <h2 className="text-4xl font-black italic">Lv. {level}</h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Next Level</p>
              <p className="text-xs font-black text-indigo-300">{nextLevelMin - stats.totalMinutes} min</p>
            </div>
          </div>
          <div className="h-3 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50"><div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div></div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 space-y-6">
        
        {/* 統計クイックビュー */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-5 rounded-3xl shadow-sm border flex flex-col items-center gap-1 transition-colors duration-300 ${bgCard}`}><Flame className={`w-6 h-6 ${stats.streak > 0 ? 'text-orange-500 animate-pulse' : isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} /><p className={`text-[10px] font-black uppercase tracking-widest ${textSub}`}>Streak</p><p className={`text-lg font-black ${textMain}`}>{stats.streak}日連続</p></div>
          <div className={`p-5 rounded-3xl shadow-sm border flex flex-col items-center gap-1 transition-colors duration-300 ${bgCard}`}><Clock className="w-6 h-6 text-blue-500" /><p className={`text-[10px] font-black uppercase tracking-widest ${textSub}`}>Total Time</p><p className={`text-lg font-black ${textMain}`}>{stats.totalMinutes}分</p></div>
        </div>

        {/* 🌟 プロフィール編集（すべての属性に対応） */}
        <section className={`p-6 md:p-8 rounded-[2.5rem] shadow-sm border transition-colors duration-300 ${bgCard}`}>
          <div className={`flex items-center gap-2 mb-8 ${textMain}`}><Settings className="w-5 h-5 text-indigo-500" /><h2 className="font-black">プロフィール設定</h2></div>

          {/* アバター色選択（既存） */}
          <div className="mb-8 flex flex-col items-center"><div className={`flex gap-3 p-3 rounded-2xl border transition-colors ${bgSubCard}`}>{AVATAR_COLORS.map((color) => (<button key={color} onClick={() => setAvatarColor(color)} className={`w-8 h-8 rounded-xl ${color} border-2 transition-all ${avatarColor === color ? (isDarkMode ? 'border-white scale-110 shadow-md' : 'border-slate-800 scale-110 shadow-md') : 'border-transparent hover:scale-105'}`}/>))}</div></div>

          <div className="space-y-6">
            {/* ニックネーム（既存） */}
            <div><label className={`block text-[10px] font-black mb-2 ml-1 uppercase tracking-widest ${textSub}`}>Nickname</label><input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="例: たろう" className={`w-full border-2 rounded-2xl px-5 py-4 font-bold outline-none transition-colors duration-300 ${bgInput}`} /></div>

            <hr className="border-slate-100 dark:border-[#2c2c2e]" />

            {/* 🌟 新規：お名前入力 */}
            <div className="space-y-3">
              <label className={`block text-[10px] font-black ml-1 uppercase tracking-widest ${textSub}`}>お名前（漢字）</label>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="姓（山田）" className={`w-full border-2 rounded-xl px-4 py-3 text-sm font-bold outline-none transition-colors duration-300 ${bgInput}`} />
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="名（太郎）" className={`w-full border-2 rounded-xl px-4 py-3 text-sm font-bold outline-none transition-colors duration-300 ${bgInput}`} />
              </div>
            </div>

            {/* 🌟 新規：年齢 */}
            <div><label className={`block text-[10px] font-black mb-2 ml-1 uppercase tracking-widest ${textSub}`}>Age</label><input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="例: 20" min="10" max="100" className={`w-full border-2 rounded-xl px-4 py-3 text-sm font-bold outline-none transition-colors duration-300 ${bgInput}`} /></div>

            {/* 🌟 新規：ステータス選択 */}
            <div>
              <label className={`block text-[10px] font-black mb-3 ml-1 uppercase tracking-widest ${textSub}`}>Current Status</label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`cursor-pointer flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${userType === 'student' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-100 dark:border-[#38383a] hover:border-indigo-200'}`}><input type="radio" value="student" checked={userType === 'student'} onChange={(e) => setUserType(e.target.value)} className="hidden" /><GraduationCap className={`w-5 h-5 ${userType === 'student' ? 'text-indigo-500' : 'text-slate-400'}`} /><span className={`text-sm font-bold ${userType === 'student' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-500'}`}>学生</span></label>
                <label className={`cursor-pointer flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${userType === 'worker' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-100 dark:border-[#38383a] hover:border-emerald-200'}`}><input type="radio" value="worker" checked={userType === 'worker'} onChange={(e) => setUserType(e.target.value)} className="hidden" /><Briefcase className={`w-5 h-5 ${userType === 'worker' ? 'text-emerald-500' : 'text-slate-400'}`} /><span className={`text-sm font-bold ${userType === 'worker' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>社会人・その他</span></label>
              </div>
            </div>

            {/* 🌟 新規：学生用の入力 */}
            {userType === 'student' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                <div className="relative">
                  <label className={`block text-[10px] font-black mb-2 ml-1 uppercase tracking-widest ${textSub}`}>University / School</label>
                  <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" value={university} onChange={(e) => { setUniversity(e.target.value); setShowUniDropdown(true); }} onFocus={() => setShowUniDropdown(true)} onBlur={() => setTimeout(() => setShowUniDropdown(false), 200)} className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl text-sm font-bold outline-none transition-all ${bgInput}`} placeholder="大学名を検索、または直接入力" /></div>
                  
                  {/* 爆速サジェスト機能 */}
                  {showUniDropdown && university.trim() && (
                    <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-[#38383a] rounded-xl shadow-xl max-h-48 overflow-y-auto no-scrollbar">
                      {filteredUnis.length > 0 ? filteredUnis.map(uni => (<li key={uni} onMouseDown={(e) => e.preventDefault()} onClick={() => { setUniversity(uni); setShowUniDropdown(false); }} className="p-3 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 cursor-pointer text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors">{uni}</li>)) : (<li className="p-3 text-sm font-bold text-slate-400 text-center">候補が見つかりません（そのまま入力可能）</li>)}
                    </ul>
                  )}
                </div>
                <div>
                  <label className={`block text-[10px] font-black mb-2 ml-1 uppercase tracking-widest ${textSub}`}>Grade</label>
                  <select value={grade} onChange={(e) => setGrade(e.target.value)} className={`w-full p-3 border-2 rounded-xl text-sm font-bold outline-none transition-all cursor-pointer ${bgInput}`}>
                    <option value="">選択してください</option>
                    <option value="大学1年生">大学1年生</option><option value="大学2年生">大学2年生</option><option value="大学3年生">大学3年生</option><option value="大学4年生">大学4年生</option><option value="大学院生">大学院生</option><option value="専門学生">専門学生</option><option value="その他学生">その他学生</option>
                  </select>
                </div>
              </div>
            )}

            {/* 🌟 新規：社会人用の入力 */}
            {userType === 'worker' && (
              <div className="animate-in fade-in slide-in-from-top-4">
                <label className={`block text-[10px] font-black mb-2 ml-1 uppercase tracking-widest ${textSub}`}>Occupation</label>
                <input type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="例：ITエンジニア、弁護士、公務員など" className={`w-full border-2 rounded-xl px-4 py-3 text-sm font-bold outline-none transition-colors duration-300 ${bgInput}`} />
              </div>
            )}

            <button
              onClick={handleSaveProfile}
              disabled={isSaving || !nickname.trim()}
              className={`w-full disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg transition-all flex justify-center items-center active:scale-95 ${isDarkMode ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-slate-900 hover:bg-black'}`}
            >
              {isSaving ? <Loader2 className="animate-spin" /> : "変更を保存する"}
            </button>
          </div>
        </section>

        {/* 🌟 おまけ：マイ本棚と学習記録へのショートカット（画像に合わせる） */}
        <button onClick={() => router.push('/materials')} className={`w-full flex items-center justify-between p-4 rounded-2xl shadow-sm border transition-all active:scale-95 mb-2 ${bgCard}`}>
          <div className="flex items-center gap-4"><div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400"><PencilLine className="w-6 h-6" /></div><span className={`text-sm font-black ${textMain}`}>マイ本棚</span></div><ChevronRight className={`w-5 h-5 ${textSub}`} />
        </button>

        <button onClick={() => setShowQrModal(true)} className={`w-full flex items-center justify-between p-4 rounded-2xl shadow-sm border transition-all active:scale-95 mb-2 ${bgCard}`}>
          <div className="flex items-center gap-4"><div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400"><QrCode className="w-6 h-6" /></div><span className={`text-sm font-black ${textMain}`}>マイQRコード / シェア</span></div><ChevronRight className={`w-5 h-5 ${textSub}`} />
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

      {/* QRコードモーダル（既存） */}
      {showQrModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300]" onClick={() => setShowQrModal(false)}></div>
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[301] w-[85%] max-w-sm ${isDarkMode ? 'bg-[#2c2c2e]' : 'bg-white'} rounded-[2.5rem] shadow-2xl p-8 flex flex-col items-center animate-in zoom-in-95 fade-in duration-300`}>
            <button onClick={() => setShowQrModal(false)} className={`absolute top-4 right-4 p-2 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}><X className="w-5 h-5" /></button>
            <h3 className={`text-lg font-black mb-6 ${textMain}`}>プロフィールQR</h3>
            
            <div className={`p-6 rounded-[2rem] shadow-sm border mb-6 flex flex-col items-center ${isDarkMode ? 'bg-white border-transparent' : 'bg-white border-slate-100'}`}>
              {profileUrl ? (
                <QRCodeSVG value={profileUrl} size={200} bgColor={"#ffffff"} fgColor={"#4f46e5"} level={"H"} imageSettings={{ src: "/logo.png", height: 48, width: 48, excavate: true }} />
              ) : (
                <div className="w-[200px] h-[200px] bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-xs font-bold text-slate-400">生成中...</div>
              )}
              <p className="text-[10px] font-black text-indigo-400 mt-4 tracking-widest uppercase">SCAN TO CONNECT</p>
            </div>
            <p className={`text-xs font-bold text-center mb-6 ${textSub}`}>このQRコードをスキャンして<br/>Study Trackerで繋がりましょう！</p>
            <button onClick={handleShareProfile} className="w-full py-4 bg-indigo-600 text-white rounded-[2rem] font-black shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"><Share2 className="w-5 h-5"/> リンクをシェア</button>
          </div>
        </>
      )}

      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[400] bg-slate-800 text-white px-6 py-3 rounded-full shadow-xl font-bold text-sm animate-in fade-in slide-in-from-bottom-4">{toastMessage}</div>
      )}

      {/* スワイプエリア */}
      <div onTouchStart={handleEdgeTouchStart} onTouchMove={handleEdgeTouchMove} onTouchEnd={handleEdgeTouchEnd} className="fixed top-0 left-0 bottom-0 w-6 z-[30]" />
      <button onClick={() => window.dispatchEvent(new Event('openSidebar'))} className={`fixed left-0 top-1/3 -translate-y-1/2 z-[20] w-4 h-24 rounded-r-xl shadow-sm flex items-center justify-center transition-all duration-300 active:scale-95 border-y border-r border-white/10 ${isDarkMode ? 'bg-slate-700/40 hover:bg-indigo-500/80' : 'bg-slate-300/50 hover:bg-indigo-500/80'} backdrop-blur-sm group`}><div className={`w-1 h-10 rounded-full transition-colors ${isDarkMode ? 'bg-slate-400/50 group-hover:bg-white' : 'bg-slate-500/50 group-hover:bg-white'}`} /></button>

      <style jsx global>{` .no-scrollbar::-webkit-scrollbar { display: none; } `}</style>
    </div>
  );
}