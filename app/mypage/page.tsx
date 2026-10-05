"use client";

import { useState, useEffect, useRef } from "react";
import { User, Settings, Loader2, LogOut, CheckCircle2, Flame, Clock, ChevronRight, Star, QrCode, Share2, X, Menu, Search, GraduationCap, Briefcase } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { calculateLevel, getLevelStartMinutes, getNextLevelMinutes } from "../../lib/levels";
import { QRCodeSVG } from 'qrcode.react';

const AVATAR_COLORS = [
  "bg-indigo-500", "bg-blue-500", "bg-emerald-500", 
  "bg-amber-500", "bg-rose-500", "bg-purple-500"
];

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
  "専門学校", "短大"
];

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
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [nickname, setNickname] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [fullProfile, setFullProfile] = useState<any>(null); 

  // 属性ステート
  const [age, setAge] = useState("");
  const [userType, setUserType] = useState('student');
  const [university, setUniversity] = useState("");
  const [grade, setGrade] = useState("");
  const [occupation, setOccupation] = useState("");

  const [showSuccess, setShowSuccess] = useState(false);
  const [stats, setStats] = useState({ totalMinutes: 0, streak: 0 });
  
  // モーダル管理用ステート
  const [showQrModal, setShowQrModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false); // 🌟 編集モーダル用
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showUniDropdown, setShowUniDropdown] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState("");

  // サイドバー管理
  const sidebarStartX = useRef<number | null>(null);
  const handleEdgeTouchStart = (e: React.TouchEvent) => { sidebarStartX.current = e.touches[0].clientX; };
  const handleEdgeTouchMove = (e: React.TouchEvent) => { 
    if (sidebarStartX.current === null) return;
    if (e.touches[0].clientX - sidebarStartX.current > 40) {
      window.dispatchEvent(new Event('openSidebar'));
      sidebarStartX.current = null; 
    }
  };
  const handleEdgeTouchEnd = () => { sidebarStartX.current = null; };

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setMyUserId(user.id);
    };
    getUserId();
  }, []);

  const profileUrl = typeof window !== 'undefined' && myUserId ? `${window.location.origin}/user/${myUserId}` : "";

  const handleShareProfile = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Study Tracker Profile', text: '私のプロフィールを見てね！', url: profileUrl }); } 
      catch (error) { console.error('Error sharing', error); }
    } else {
      navigator.clipboard.writeText(profileUrl);
      setToastMessage("URLをコピーしました！");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  useEffect(() => {
    const checkDarkMode = () => setIsDarkMode(localStorage.getItem('dark_mode') === 'true');
    checkDarkMode();
    window.addEventListener('storage', checkDarkMode);
    window.addEventListener('darkModeChanged', checkDarkMode);
    return () => {
      window.removeEventListener('storage', checkDarkMode);
      window.removeEventListener('darkModeChanged', checkDarkMode);
    };
  }, []);

  useEffect(() => { fetchProfileAndStats(); }, []);

  const fetchProfileAndStats = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setUserEmail(user.email || "");

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

    if (profile) {
      setNickname(profile.nickname || "");
      setAvatarColor(profile.avatar_url || AVATAR_COLORS[0]);
      setFullProfile(profile);
      setAge(profile.age || "");
      setUserType(profile.user_type || 'student');
      setUniversity(profile.university || "");
      setGrade(profile.grade || "");
      setOccupation(profile.occupation || "");
    }

    const { data: logs } = await supabase.from('study_logs').select('duration_minutes, studied_at').eq('student_id', user.id).order('studied_at', { ascending: false });

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
        } else break;
      }
      setStats({ totalMinutes: totalMin, streak });
    }
    setIsLoading(false);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 🌟 本名(real_name)は更新対象から外して変更不可に！
    const { error } = await supabase
      .from('profiles')
      .update({ 
        nickname: nickname, 
        avatar_url: avatarColor,
        age: age,
        user_type: userType,
        university: userType === 'student' ? university : null,
        grade: userType === 'student' ? grade : null,
        occupation: userType === 'worker' ? occupation : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) {
      alert("保存に失敗しました: " + error.message);
    } else {
      setShowSuccess(true);
      setShowEditModal(false); // 🌟 保存成功時にモーダルを閉じる
      setTimeout(() => setShowSuccess(false), 3000);
      fetchProfileAndStats();
      window.dispatchEvent(new Event('profileUpdated'));
    }
    setIsSaving(false);
  };

  const filteredUnis = university.trim() === '' ? [] : UNIVERSITIES.filter(uni => uni.includes(university)).slice(0, 10);

  if (isLoading) return <div className={`text-center mt-20 font-bold animate-pulse ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>ステータス同期中...</div>;

  const level = calculateLevel(stats.totalMinutes);
  const currentLevelMin = getLevelStartMinutes(level);
  const nextLevelMin = getNextLevelMinutes(level);
  const progress = ((stats.totalMinutes - currentLevelMin) / (nextLevelMin - currentLevelMin)) * 100;

  const bgPage = isDarkMode ? "bg-[#0a0a0a]" : "bg-slate-50";
  const bgCard = isDarkMode ? "bg-[#1c1c1e] border-[#2c2c2e]" : "bg-white border-slate-100";
  const bgSubCard = isDarkMode ? "bg-[#2c2c2e] border-[#38383a]" : "bg-slate-50 border-slate-100";
  const textMain = isDarkMode ? "text-white" : "text-slate-800";
  const textSub = isDarkMode ? "text-slate-400" : "text-slate-400";
  const bgInput = isDarkMode ? "bg-[#2c2c2e] border-[#38383a] text-white placeholder-slate-500 focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-700 focus:border-indigo-500";

  return (
    <div className={`min-h-screen font-sans pb-32 transition-colors duration-300 ${bgPage}`}>
      
      {showSuccess && (
        <div className="fixed top-4 left-4 right-4 z-[100] bg-emerald-600 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top duration-300 max-w-md mx-auto">
          <CheckCircle2 className="w-6 h-6" />
          <span className="font-bold">プロフィールを更新しました！</span>
        </div>
      )}

      {/* ヘッダーエリア */}
      <div className={`relative px-6 pt-12 pb-10 rounded-b-[3rem] shadow-sm border-b mb-6 transition-colors duration-300 ${bgCard}`}>
        <button onClick={() => window.dispatchEvent(new Event('openSidebar'))} className={`absolute top-6 left-6 p-2 rounded-xl transition-all active:scale-90 ${isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}><Menu className="w-6 h-6" /></button>

        <div className="max-w-md mx-auto flex items-center gap-6 mt-4">
          <div className={`w-20 h-20 ${avatarColor} rounded-[2rem] flex items-center justify-center shadow-lg transform rotate-3 flex-shrink-0 border-2 ${isDarkMode ? 'border-[#2c2c2e]' : 'border-white'}`}>
            <span className="text-3xl font-black text-white">{nickname ? nickname.charAt(0).toUpperCase() : "?"}</span>
          </div>
          <div>
            <h1 className={`text-2xl font-black transition-colors ${textMain}`}>{nickname || "ゲスト"}</h1>
            {fullProfile && getSubProfileText(fullProfile) && (
              <div className={`inline-block mt-1 px-3 py-1 text-[10px] font-bold rounded-full ${isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
                {getSubProfileText(fullProfile)}
              </div>
            )}
            <p className={`text-[10px] font-bold transition-colors mt-1.5 ${textSub}`}>{userEmail}</p>
          </div>
        </div>

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

      <main className="max-w-md mx-auto px-4 space-y-4">
        
        {/* 統計クイックビュー */}
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div className={`p-5 rounded-3xl shadow-sm border flex flex-col items-center gap-1 transition-colors duration-300 ${bgCard}`}><Flame className={`w-6 h-6 ${stats.streak > 0 ? 'text-orange-500 animate-pulse' : isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} /><p className={`text-[10px] font-black uppercase tracking-widest ${textSub}`}>Streak</p><p className={`text-lg font-black ${textMain}`}>{stats.streak}日連続</p></div>
          <div className={`p-5 rounded-3xl shadow-sm border flex flex-col items-center gap-1 transition-colors duration-300 ${bgCard}`}><Clock className="w-6 h-6 text-blue-500" /><p className={`text-[10px] font-black uppercase tracking-widest ${textSub}`}>Total Time</p><p className={`text-lg font-black ${textMain}`}>{stats.totalMinutes}分</p></div>
        </div>

        {/* 🌟 プロフィール編集ボタン (モーダルを開く) */}
        <button onClick={() => setShowEditModal(true)} className={`w-full flex items-center justify-between p-4 rounded-2xl shadow-sm border transition-all active:scale-95 ${bgCard}`}>
          <div className="flex items-center gap-4"><div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400"><Settings className="w-6 h-6" /></div><span className={`text-sm font-black ${textMain}`}>プロフィールを編集</span></div><ChevronRight className={`w-5 h-5 ${textSub}`} />
        </button>

        {/* QRコード/シェア */}
        <button onClick={() => setShowQrModal(true)} className={`w-full flex items-center justify-between p-4 rounded-2xl shadow-sm border transition-all active:scale-95 ${bgCard}`}>
          <div className="flex items-center gap-4"><div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400"><QrCode className="w-6 h-6" /></div><span className={`text-sm font-black ${textMain}`}>マイQRコード / シェア</span></div><ChevronRight className={`w-5 h-5 ${textSub}`} />
        </button>

        {/* ログアウト */}
        <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className={`w-full flex items-center justify-center gap-2 font-bold py-4 rounded-2xl transition-all active:scale-95 mt-6 ${isDarkMode ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-50 hover:bg-rose-100 text-rose-600'}`}>
          <LogOut className="w-5 h-5" /> ログアウト
        </button>

        {/* 利用規約・プライバシーポリシー */}
        <div className="flex items-center justify-center gap-4 mt-4 pb-2">
          <button onClick={() => setShowTermsModal(true)} className={`text-[11px] font-bold underline underline-offset-2 ${isDarkMode ? 'text-slate-600 hover:text-slate-400' : 'text-slate-300 hover:text-slate-500'} transition-colors`}>
            利用規約
          </button>
          <span className={`text-[11px] ${isDarkMode ? 'text-slate-700' : 'text-slate-200'}`}>·</span>
          <button onClick={() => setShowPrivacyModal(true)} className={`text-[11px] font-bold underline underline-offset-2 ${isDarkMode ? 'text-slate-600 hover:text-slate-400' : 'text-slate-300 hover:text-slate-500'} transition-colors`}>
            プライバシーポリシー
          </button>
        </div>

      </main>

      {/* 利用規約モーダル */}
      {showTermsModal && (
        <div className="fixed inset-0 z-[400] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowTermsModal(false)}>
          <div className={`rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between p-5 border-b flex-shrink-0 ${isDarkMode ? 'border-[#2c2c2e]' : 'border-slate-100'}`}>
              <h2 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Mercury 利用規約</h2>
              <button onClick={() => setShowTermsModal(false)} className={`p-1 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className={`flex-1 min-h-0 overflow-y-auto p-5 text-xs space-y-4 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              <p className="text-slate-400">制定日：2026年10月5日</p>
              <p><strong>第1条（適用）</strong><br/>1. 本利用規約（以下「本規約」という。）は、運営者が提供する学習管理アプリ「Mercury」（以下「本アプリ」という。）の利用条件を定めるものである。<br/>2. 本規約は、本アプリを利用するすべての者（以下「ユーザー」という。）に適用される。<br/>3. 運営者が本アプリ上で別途定める注意事項、ガイドラインその他の規定は、本規約の一部を構成する。本規約と矛盾する場合は、当該規定が優先する。</p>
              <p><strong>第2条（利用の開始）</strong><br/>1. ユーザーは、Googleアカウントでログインし、本規約に同意したうえで、本アプリの利用を開始するものとする。<br/>2. ログインして利用を開始した時点で、ユーザーは本規約に同意したものとみなす。<br/>3. 未成年者は、保護者の同意を得たうえで利用すること。</p>
              <p><strong>第3条（サービス内容）</strong><br/>本アプリは、次の機能を基本無料で提供する。(1) PDFの閲覧、書き込み、注釈、検索 (2) 学習時間・学習内容の記録、および学習状況のグラフ表示 (3) 課題・やるべきことの管理（Todo） (4) 学習時間に応じたレベルアップ等の機能 (5) 学習時間ランキング（すたらん）、ルーム、フォロワーなど、他のユーザーと交流する機能 (6) ユーザーが許可した場合のGoogleドライブとの連携 (7) その他、運営者が追加する機能</p>
              <p><strong>第4条（利用料金）</strong><br/>本アプリは基本無料で提供する。ただし、運営者が一部の機能を有料とする場合は、事前にその内容および料金を本アプリまたはウェブサイト上で知らせる。</p>
              <p><strong>第5条（アカウントの管理）</strong><br/>ユーザーは、自己のGoogleアカウントおよび端末を、自己の責任で管理するものとする。</p>
              <p><strong>第6条（Googleアカウントおよび外部サービスとの連携）</strong><br/>1. 本アプリは、ユーザーが許可した範囲でのみ、Googleアカウントの情報（メールアドレス、氏名、プロフィール画像）およびGoogleドライブ上の、ユーザーが選択したファイルを利用する。<br/>2. ユーザーは、Googleアカウントの設定画面から、いつでも本アプリへの許可を取り消すことができる。<br/>3. 運営者は、Google、Supabase、Vercelなどの外部サービスを利用して本アプリを運営している。外部サービスの利用条件は、各提供者の定めるところによる。</p>
              <p><strong>第7条（禁止事項）</strong><br/>ユーザーは、次の行為をしてはならない。(1) 法令または公序良俗に違反する行為 (2) 本アプリのサーバーやネットワークに過度な負荷をかける行為 (3) 不正アクセス、またはその試み (4) 本アプリのスクレイピング、リバースエンジニアリング、その他の方法による解析 (5) 他者の権利（知的財産権、プライバシー、名誉など）を侵害する行為 (6) 本アプリの交流機能（ランキング、ルーム、フォロワー等）を通じて、他のユーザーに嫌がらせをし、または迷惑をかける行為 (7) 本アプリを、運営者が意図しない方法で利用し、または第三者に不正に利用させる行為 (8) 虚偽の学習記録を登録するなど、他のユーザーを欺く行為 (9) その他、運営者が不適切と判断する行為</p>
              <p><strong>第8条（知的財産権）</strong><br/>本アプリおよびこれに付随する一切のコンテンツに関する知的財産権は、運営者または正当な権利者に帰属する。ユーザーは、これらを運営者の許可なく複製、転載、再配布してはならない。</p>
              <p><strong>第9条（ユーザーのデータおよび公開される情報）</strong><br/>1. ユーザーが本アプリに登録した学習記録その他のデータ（以下「ユーザーデータ」という。）の権利は、ユーザーに帰属する。<br/>2. 運営者は、本アプリの提供・維持・改善に必要な範囲でのみ、ユーザーデータを利用する。<br/>3. ランキング、ルーム、フォロワーなどの交流機能では、ユーザー名、学習時間その他の情報が、他のユーザーに表示される場合がある。ユーザーは、これに同意のうえ利用するものとする。<br/>4. ユーザーデータの取扱いは、別に定めるプライバシーポリシーに従う。</p>
              <p><strong>第10条（データの保存）</strong><br/>運営者は、ユーザーデータの保存に努めるが、その消失・破損が生じないことを保証しない。重要なデータは、ユーザー自身でも控えを取ること。</p>
              <p><strong>第11条（サービスの変更・中断・終了）</strong><br/>1. 運営者は、保守、障害、不可抗力その他の事情により、事前の通知なく本アプリの全部または一部を中断することがある。<br/>2. 運営者は、必要に応じて、本アプリの内容を変更し、または提供を終了することがある。終了する場合は、可能な限り事前に本アプリまたはウェブサイト上で知らせる。</p>
              <p><strong>第12条（利用の停止および退会）</strong><br/>1. 運営者は、ユーザーが本規約に違反した場合、事前の通知なく、そのユーザーの利用を停止することがある。<br/>2. ユーザーは、第17条の連絡先に申し出ることにより、いつでも退会し、自己のデータの削除を求めることができる。</p>
              <p><strong>第13条（免責）</strong><br/>1. 本アプリは現状有姿で提供する。運営者は、本アプリの正確性、有用性、継続性、エラーがないことについて保証しない。<br/>2. 本アプリの利用により学習の成果が得られることを、運営者は保証しない。<br/>3. 交流機能を通じたユーザー間のトラブルについて、運営者は責任を負わない。ただし、運営者が必要と判断した場合は、対応を行うことがある。<br/>4. 本アプリの中断、変更、終了、またはユーザーデータの消失・破損によってユーザーに生じた損害について、運営者は責任を負わない。<br/>5. 運営者に故意または重大な過失がある場合には、本条および次条の免責・責任制限は適用されない。</p>
              <p><strong>第14条（責任の制限）</strong><br/>運営者がユーザーに対して損害賠償責任を負う場合でも、その範囲は、ユーザーに現実に生じた通常の直接損害に限る。</p>
              <p><strong>第15条（規約の変更）</strong><br/>1. 運営者は、必要に応じて本規約を変更することがある。<br/>2. 変更後の規約は、本アプリまたはウェブサイトに掲載した時点から効力を生じる。重要な変更を行う場合は、掲載を通じて事前に知らせる。<br/>3. 変更後に本アプリを利用した場合、ユーザーは変更後の規約に同意したものとみなす。</p>
              <p><strong>第16条（準拠法・管轄）</strong><br/>本規約は日本法に準拠する。本アプリに関して紛争が生じた場合は、民事訴訟法に定める管轄裁判所を第一審の裁判所とする。</p>
              <p><strong>第17条（連絡先）</strong><br/>本規約および本アプリに関する問い合わせは、次の連絡先に行うこと。運営者：Mercury運営局／メール：admin.mercury@gmail.com</p>
            </div>
            <div className={`p-4 border-t flex-shrink-0 ${isDarkMode ? 'border-[#2c2c2e]' : 'border-slate-100'}`}>
              <button onClick={() => setShowTermsModal(false)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm transition-all active:scale-95">閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* プライバシーポリシーモーダル */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-[400] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowPrivacyModal(false)}>
          <div className={`rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between p-5 border-b flex-shrink-0 ${isDarkMode ? 'border-[#2c2c2e]' : 'border-slate-100'}`}>
              <h2 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Mercury プライバシーポリシー</h2>
              <button onClick={() => setShowPrivacyModal(false)} className={`p-1 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className={`flex-1 min-h-0 overflow-y-auto p-5 text-xs space-y-4 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              <p className="text-slate-400">制定日：2026年10月5日</p>
              <p>Mercury運営局（以下「運営者」という。）は、学習管理アプリ「Mercury」（以下「本アプリ」という。）におけるユーザーの個人情報およびデータの取扱いについて、本プライバシーポリシー（以下「本ポリシー」という。）を定める。</p>
              <p><strong>第1条（基本方針）</strong><br/>運営者は、個人情報の保護に関する法律その他の関連法令、およびGoogle API Services User Data Policy（Limited Use の要件を含む。）を遵守し、必要な範囲で適正に個人情報を取り扱う。</p>
              <p><strong>第2条（取得する情報）</strong><br/>運営者は、次の情報を取得する。1. Googleアカウントの情報：ユーザーがGoogleアカウントでログインする際に、メールアドレス、氏名、プロフィール画像を取得する。2. ユーザーが本アプリに登録する情報：学習記録、学習時間、Todo、ルームやフォロワーに関する情報、設定情報など、ユーザーが本アプリ上で作成・登録する情報。3. Googleドライブに関する情報：ユーザーがGoogleドライブ連携を許可し、ファイルを選択した場合に、そのファイルを表示するためのアクセス情報。4. 技術情報：本アプリの提供および不具合の把握のために、アクセス日時、利用環境などの情報を取得する場合がある。</p>
              <p><strong>第3条（Googleユーザーデータの取扱い）</strong><br/>1. 利用目的の限定：本アプリが取得するGoogleユーザーデータ（メールアドレス、氏名、プロフィール画像、およびユーザーが選択したGoogleドライブ上のファイル）は、(1) ユーザーの認証およびアカウントの識別、(2) ユーザーが選択したGoogleドライブ上のファイルを本アプリ内で表示すること、の目的にのみ利用する。2. Limited Use の遵守：運営者は、Googleユーザーデータを、広告、独自のAI・機械学習モデルの学習、または運営者もしくは第三者の別目的のために利用しない。3. Googleドライブのファイルについて：本アプリは、ユーザーが選択したGoogleドライブ上のファイルを表示するのみであり、その内容を運営者のサーバーに保存しない。4. 権限の範囲：本アプリは、ユーザーがGoogleドライブで選択したファイルにのみアクセスし、ドライブ内のその他のファイルにはアクセスしない。5. 連携の解除：ユーザーは、Googleアカウントのセキュリティ設定（https://myaccount.google.com/permissions）から、いつでも本アプリへの連携を解除できる。</p>
              <p><strong>第4条（情報の保存先）</strong><br/>1. ユーザーのログイン情報および学習データは、Supabase, Inc.（以下「Supabase」という。）の提供するデータベース（東京リージョン）に保存される。2. 本アプリは、Vercel, Inc.（以下「Vercel」という。）のプラットフォーム上で提供される。3. Googleドライブ上のファイルの内容は、運営者のサーバーに保存されない。</p>
              <p><strong>第5条（利用目的）</strong><br/>運営者は、取得した情報を次の目的で利用する。(1) 本アプリの提供、維持、および改善 (2) ユーザーの認証およびアカウントの管理 (3) 学習記録の保存および表示 (4) ランキング、ルーム、フォロワーなどの交流機能の提供 (5) 不正利用の防止および対応 (6) ユーザーからの問い合わせへの対応。運営者は、上記の目的の範囲を超えて情報を利用しない。</p>
              <p><strong>第6条（他のユーザーに表示される情報）</strong><br/>本アプリの交流機能（ランキング、ルーム、フォロワーなど）では、ユーザー名、学習時間その他の一部の情報が、他のユーザーに表示される。ユーザーは、これを理解したうえで当該機能を利用するものとする。メールアドレスは、他のユーザーに表示されない。</p>
              <p><strong>第7条（第三者提供）</strong><br/>運営者は、(1) ユーザーの同意がある場合、(2) 法令に基づく場合、(3) 人の生命、身体または財産の保護のために必要であって、本人の同意を得ることが困難な場合、を除き、個人情報を第三者に提供しない。</p>
              <p><strong>第8条（外部サービスの利用）</strong><br/>運営者は、本アプリの運営のために、前条にかかわらず、Google、Supabase、Vercelなどの外部サービスを利用する。これらのサービスにおける情報の取扱いは、各提供者の定めるプライバシーポリシーに従う。</p>
              <p><strong>第9条（データの保存期間）</strong><br/>運営者は、利用目的の達成に必要な期間、情報を保存する。ユーザーが退会した場合、または削除の求めがあった場合は、法令で保存が義務付けられている場合を除き、その情報を速やかに削除する。</p>
              <p><strong>第10条（安全管理措置）</strong><br/>運営者は、情報の漏えい、滅失または毀損を防ぐため、通信の暗号化（HTTPS）、アクセス制御などの措置を講じる。ただし、インターネットを通じた情報の送受信において、完全な安全性を保証するものではない。</p>
              <p><strong>第11条（ユーザーの権利）</strong><br/>ユーザーは、自己の個人情報について、開示、訂正、利用停止、削除を求めることができる。これらを希望する場合は、第13条の連絡先に申し出ること。運営者は、本人からの求めであることを確認のうえ、適切に対応する。</p>
              <p><strong>第12条（本ポリシーの変更）</strong><br/>1. 運営者は、必要に応じて本ポリシーを変更することがある。2. 変更後の本ポリシーは、本アプリまたはウェブサイトに掲載した時点から効力を生じる。重要な変更を行う場合は、掲載を通じて事前に知らせる。</p>
              <p><strong>第13条（連絡先）</strong><br/>本ポリシーおよび個人情報の取扱いに関する問い合わせは、次の連絡先に行うこと。運営者：Mercury運営局／メール：admin.mercury@gmail.com</p>
            </div>
            <div className={`p-4 border-t flex-shrink-0 ${isDarkMode ? 'border-[#2c2c2e]' : 'border-slate-100'}`}>
              <button onClick={() => setShowPrivacyModal(false)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm transition-all active:scale-95">閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          🌟 プロフィール編集モーダル (新規追加)
      ========================================= */}
      {showEditModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300]" onClick={() => setShowEditModal(false)}></div>
          <div className={`fixed bottom-0 left-0 right-0 z-[301] max-h-[85vh] overflow-y-auto no-scrollbar ${isDarkMode ? 'bg-[#1c1c1e]' : 'bg-white'} rounded-t-[2.5rem] shadow-2xl p-6 md:p-8 animate-in slide-in-from-bottom duration-300`}>
            
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-lg font-black ${textMain}`}>プロフィール編集</h3>
              <button onClick={() => setShowEditModal(false)} className={`p-2 rounded-full ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'}`}><X className="w-5 h-5" /></button>
            </div>

            {/* アバター色選択 */}
            <div className="mb-6 flex flex-col items-center">
              <div className={`flex gap-3 p-3 rounded-2xl border transition-colors ${bgSubCard}`}>
                {AVATAR_COLORS.map((color) => (
                  <button key={color} onClick={() => setAvatarColor(color)} className={`w-8 h-8 rounded-xl ${color} border-2 transition-all ${avatarColor === color ? (isDarkMode ? 'border-white scale-110 shadow-md' : 'border-slate-800 scale-110 shadow-md') : 'border-transparent hover:scale-105'}`}/>
                ))}
              </div>
            </div>

            <div className="space-y-6 pb-6">
              {/* ニックネーム */}
              <div><label className={`block text-[10px] font-black mb-2 ml-1 uppercase tracking-widest ${textSub}`}>Nickname</label><input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="例: たろう" className={`w-full border-2 rounded-xl px-4 py-3 text-sm font-bold outline-none transition-colors duration-300 ${bgInput}`} /></div>

              {/* 年齢 */}
              <div><label className={`block text-[10px] font-black mb-2 ml-1 uppercase tracking-widest ${textSub}`}>Age</label><input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="例: 20" min="10" max="100" className={`w-full border-2 rounded-xl px-4 py-3 text-sm font-bold outline-none transition-colors duration-300 ${bgInput}`} /></div>

              {/* ステータス選択 */}
              <div>
                <label className={`block text-[10px] font-black mb-3 ml-1 uppercase tracking-widest ${textSub}`}>Current Status</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`cursor-pointer flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${userType === 'student' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-100 dark:border-[#38383a] hover:border-indigo-200'}`}><input type="radio" value="student" checked={userType === 'student'} onChange={(e) => setUserType(e.target.value)} className="hidden" /><GraduationCap className={`w-5 h-5 ${userType === 'student' ? 'text-indigo-500' : 'text-slate-400'}`} /><span className={`text-sm font-bold ${userType === 'student' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-500'}`}>学生</span></label>
                  <label className={`cursor-pointer flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${userType === 'worker' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-100 dark:border-[#38383a] hover:border-emerald-200'}`}><input type="radio" value="worker" checked={userType === 'worker'} onChange={(e) => setUserType(e.target.value)} className="hidden" /><Briefcase className={`w-5 h-5 ${userType === 'worker' ? 'text-emerald-500' : 'text-slate-400'}`} /><span className={`text-sm font-bold ${userType === 'worker' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>社会人</span></label>
                </div>
              </div>

              {/* 学生用の入力 */}
              {userType === 'student' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                  <div className="relative">
                    <label className={`block text-[10px] font-black mb-2 ml-1 uppercase tracking-widest ${textSub}`}>University / School</label>
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" value={university} onChange={(e) => { setUniversity(e.target.value); setShowUniDropdown(true); }} onFocus={() => setShowUniDropdown(true)} onBlur={() => setTimeout(() => setShowUniDropdown(false), 200)} className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl text-sm font-bold outline-none transition-all ${bgInput}`} placeholder="大学名" /></div>
                    {showUniDropdown && university.trim() && (
                      <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-[#38383a] rounded-xl shadow-xl max-h-48 overflow-y-auto no-scrollbar">
                        {filteredUnis.length > 0 ? filteredUnis.map(uni => (<li key={uni} onMouseDown={(e) => e.preventDefault()} onClick={() => { setUniversity(uni); setShowUniDropdown(false); }} className="p-3 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 cursor-pointer text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors">{uni}</li>)) : (<li className="p-3 text-sm font-bold text-slate-400 text-center">候補が見つかりません</li>)}
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

              {/* 社会人用の入力 */}
              {userType === 'worker' && (
                <div className="animate-in fade-in slide-in-from-top-4">
                  <label className={`block text-[10px] font-black mb-2 ml-1 uppercase tracking-widest ${textSub}`}>Occupation</label>
                  <input type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="例：ITエンジニア" className={`w-full border-2 rounded-xl px-4 py-3 text-sm font-bold outline-none transition-colors duration-300 ${bgInput}`} />
                </div>
              )}

              <button
                onClick={handleSaveProfile}
                disabled={isSaving || !nickname.trim()}
                className={`w-full disabled:opacity-50 text-white font-black py-4 rounded-xl shadow-lg transition-all flex justify-center items-center active:scale-95 ${isDarkMode ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-slate-900 hover:bg-black'}`}
              >
                {isSaving ? <Loader2 className="animate-spin" /> : "変更を保存する"}
              </button>
            </div>
          </div>
        </>
      )}

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