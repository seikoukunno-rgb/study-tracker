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
              <p><strong>第1条（適用および規約の構成）</strong><br/>本利用規約（以下「本規約」）は、当開発者が提供するアプリケーション「Mercury」（以下「本アプリ」）の利用条件を定めるものです。本規約は、本アプリの利用に関する当開発者とユーザーとの間の一切の関係に適用されます。当開発者は、ガイドライン・ポリシー・ヘルプページその他の規定（以下「個別規定」）を定めることがあります。個別規定は本規約の一部を構成し、本規約と矛盾する場合は個別規定が優先されます。ユーザーは本アプリを利用することにより、本規約のすべての条項に同意したものとみなされます。</p>
              <p><strong>第2条（定義）</strong><br/>「コンテンツ」：テキスト、画像、音声、動画、プログラム、データベースその他一切の情報。「ユーザー投稿情報」：ユーザーが本アプリに保存、投稿、アップロードした一切のデータ（PDF、学習履歴等を含む）。「外部サービス」：Amazon、楽天、メルカリ等、第三者が提供するサービス。「アカウント」：ユーザー識別のために付与される利用権限。「知的財産権」：著作権、特許権、商標権、営業秘密その他一切の権利。</p>
              <p><strong>第3条（利用登録およびアカウント管理）</strong><br/>利用希望者は本規約に同意のうえ、当開発者の定める方法により登録申請を行い、承認された時点で利用契約が成立します。虚偽情報の申請・過去の規約違反・その他不適切と合理的に判断される場合、当開発者は登録を拒否できます。ユーザーはアカウント情報を自己責任で管理し、第三者への開示・貸与・譲渡はなりません。不正利用による損害はユーザーが負担し、当開発者は責任を負いません。不正利用を発見した場合は速やかに当開発者へ通知するものとします。</p>
              <p><strong>第4条（サービス内容）</strong><br/>本アプリは、教材・書籍検索（アフィリエイトリンク含む）、学習データ管理（PDF・本棚機能）、学習時間記録および分析、その他当開発者が追加する機能を提供します。当開発者は機能の追加・変更・削除を自由に行うことができます。</p>
              <p><strong>第5条（禁止事項）</strong><br/>ユーザーは以下の行為を行ってはなりません。【技術的侵害行為】スクレイピング・クローリング等の自動取得、APIの不正利用、リバースエンジニアリング、セキュリティ回避行為。【サービス妨害】サーバー負荷行為、DDoS攻撃、不正アクセス、他ユーザーの利用妨害。【法令・倫理違反】知的財産権侵害、犯罪行為、名誉毀損、不適切コンテンツ投稿。【商業的不正利用】無断転載・再配布、本サービスの競合サービス開発目的での利用。</p>
              <p><strong>第6条（違反時の措置）</strong><br/>規約違反が認められた場合、当開発者はアカウント停止・利用制限・データ削除を実施できます。損害が発生した場合、ユーザーはその全額を賠償する義務を負います。悪質な場合、刑事告訴・民事訴訟を含む法的措置を取ります。</p>
              <p><strong>第7条（知的財産権）</strong><br/>本アプリの権利はすべて当開発者または正当な権利者に帰属します。ユーザー投稿情報の権利はユーザーに留保されます。ただしユーザーは、運営に必要な範囲で無償利用を許諾します。ユーザーは第三者権利を侵害しないことを保証します。</p>
              <p><strong>第8条（データおよびバックアップ）</strong><br/>当開発者はデータの保存を保証しません。ユーザーは自己責任でバックアップを行うものとします。データ消失による損害について責任を負いません。</p>
              <p><strong>第9条（外部サービス）</strong><br/>外部サービスとの取引はユーザー責任で行われます。商品品質・配送・価格の正確性は保証されません。トラブルについて当開発者は関与しません。</p>
              <p><strong>第10条（サービスの変更・停止）</strong><br/>保守・障害・不可抗力等の場合にサービスを停止できます。サービス終了も可能です。これに伴う損害責任は負いません。</p>
              <p><strong>第11条（非保証）</strong><br/>当開発者は以下を保証しません：正確性、完全性、有用性、継続性、エラーがないこと。</p>
              <p><strong>第12条（責任制限）</strong><br/>当開発者の責任は限定されます。間接損害・逸失利益は対象外です。法令上許される最大限まで制限されます。</p>
              <p><strong>第13条（プライバシー）</strong><br/>個人情報は別途ポリシーに従い処理されます。</p>
              <p><strong>第14条（規約変更）</strong><br/>当開発者は自由に変更可能です。掲載時点で効力が発生し、継続利用により同意とみなされます。</p>
              <p><strong>第15条（契約の終了）</strong><br/>ユーザーはいつでも退会可能です。当開発者は違反時に強制解約可能です。終了後も一部条項は存続します。</p>
              <p><strong>第16条（準拠法・管轄）</strong><br/>日本法準拠。専属管轄は当開発者所在地裁判所とします。</p>
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
              <p><strong>第1条（基本方針および適用範囲）</strong><br/>当開発者は、アプリケーション「Mercury」においてユーザーの個人情報の保護を最重要事項として位置付けます。個人情報の保護に関する法律その他関連法令、各国規制（GDPR・CCPA等）、およびGoogle API Services User Data Policyを遵守し、適法かつ公正な手段により情報を取得・利用・管理します。目的限定原則・データ最小化原則・透明性の確保・安全管理の徹底の原則に基づき運用します。</p>
              <p><strong>第2条（定義）</strong><br/>「個人情報」：特定の個人を識別できる情報。「ユーザーデータ」：ユーザーが本アプリに提供または生成するすべての情報。「Googleユーザーデータ」：Googleアカウント連携により取得される情報。「処理」：取得・保存・利用・削除等の一切の取扱い。</p>
              <p><strong>第3条（収集する情報）</strong><br/>【ユーザー行動データ】検索履歴・閲覧履歴・学習時間・教材登録情報・操作ログ・設定情報。【技術情報】デバイス識別子（広告ID等）・OS・ブラウザ・言語設定・IPアドレス・アクセス日時。【Cookieおよび類似技術】セッション管理・利用状況分析・広告効果測定。【外部連携情報】Google Driveアクセストークン・API経由のメタデータ。</p>
              <p><strong>第4条（Googleユーザーデータの特別規定）</strong><br/>Google Drive連携機能を提供するにあたり以下を厳守します。【利用目的の厳格限定】Googleユーザーデータはユーザーが指定したファイルの表示・本アプリ内での閲覧機能提供のみに使用します。広告・分析・機械学習・第三者提供には一切利用しません。【非保存原則】ファイル本体はサーバーに保存しません。データは一時的処理のみ。キャッシュも恒久保存しません。【人的アクセス制限】ユーザーからの明示的なサポート依頼・セキュリティ対応・法令対応の場合を除き、人間がデータへアクセスすることはありません。【第三者提供の禁止】法令に基づく場合・明示的同意を除き提供されません。【セキュリティ管理】OAuthトークンの安全管理・HTTPS通信の強制・不正アクセス防止。</p>
              <p><strong>第5条（利用目的）</strong><br/>収集した情報はサービス提供・維持・改善、パーソナライズ、不正利用検知、ユーザーサポート、統計分析（匿名化データのみ）の範囲で利用されます。目的外利用は行いません。</p>
              <p><strong>第6条（広告およびトラッキング）</strong><br/>本アプリはAmazonアソシエイト・楽天アフィリエイト・メルカリアンバサダーを利用します。これらはCookie等を利用する場合があります。ユーザーはブラウザ設定によりCookieを制御できます。</p>
              <p><strong>第7条（第三者提供）</strong><br/>本人同意・法令要求・緊急保護の場合を除き、個人情報を第三者に提供しません。</p>
              <p><strong>第8条（委託・外部処理）</strong><br/>クラウドインフラ・認証・分析等の処理を外部委託する場合があります。委託先は適切に監督されます。</p>
              <p><strong>第9条（データ保存期間）</strong><br/>必要最小限の期間のみ保持します。不要データは削除または匿名化します。法令義務がある場合は保存します。</p>
              <p><strong>第10条（国際データ移転）</strong><br/>個人情報は国外に移転される場合があります。この場合、適切な保護措置を講じます。</p>
              <p><strong>第11条（安全管理措置）</strong><br/>SSL/TLS暗号化・アクセス制御・セキュリティ監査・不正アクセス防止を実施します。ただし完全な安全性は保証されません。</p>
              <p><strong>第12条（ユーザーの権利）</strong><br/>ユーザーは開示・訂正・削除・利用停止・データポータビリティを行う権利を有します。</p>
              <p><strong>第13条（未成年）</strong><br/>未成年は保護者同意が必要です。</p>
              <p><strong>第14条（責任の限定）</strong><br/>外部サービス起因の問題・ユーザーの管理不備・通信環境の問題について責任を負いません。</p>
              <p><strong>第15条（ポリシーの変更）</strong><br/>本ポリシーは変更可能です。掲示時点で効力が発生し、継続利用により同意とみなされます。</p>
              <p><strong>第16条（お問い合わせ）</strong><br/>問い合わせはアプリ内または開発者へご連絡ください。</p>
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