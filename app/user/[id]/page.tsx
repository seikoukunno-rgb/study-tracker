"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "../../../lib/supabase"; 
import { User, ArrowLeft, BookOpen, Clock, Flame } from "lucide-react";
import { useRouter } from "next/navigation";
import FollowButton from "../../../components/FollowButton"; 

// 🌟 プロフィールのサブ情報（大学や職業）を整形する関数を追加
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

export default function UserProfile({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const targetId = resolvedParams.id;

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, streak: 0 });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  
  // 🌟 ダークモード用のステートを追加
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Recordモード用のデータ箱と、タブの切り替え状態
  const [materialRecords, setMaterialRecords] = useState<any[]>([]);
  const [feedMode, setFeedMode] = useState<'timeline' | 'record'>('timeline');

  // 🌟 ダークモードの同期処理
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
    const fetchUserData = async () => {
      if (!targetId) return;

      // 1. プロフィールの取得 (※ select('*') なので大学名等も自動で取れます)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .single();

      if (profileData) setProfile(profileData);

      // 2. 学習ログの取得
      const { data: allLogs } = await supabase
        .from('study_logs')
        .select(`
          id,
          duration_minutes,
          studied_at,
          thoughts,
          materials ( title, image_url )
        `)
        .eq('student_id', targetId)
        .order('studied_at', { ascending: false });

      if (allLogs) {
        setRecentLogs(allLogs.slice(0, 15));
        
        // 3. 統計（Total Time & Streak）の計算
        const total = allLogs.reduce((sum, log) => sum + (Number(log.duration_minutes) || 0), 0);
        const uniqueDates = Array.from(new Set(allLogs.map(l => l.studied_at?.split('T')[0] || l.studied_at)));
        setStats({ total, streak: uniqueDates.length });

        // 4. Record用の集計
        const recordsMap = new Map();
        allLogs.forEach(log => {
          const materialData = Array.isArray(log.materials) ? log.materials[0] : log.materials;
          const title = materialData?.title || "独自教材";
          const imageUrl = materialData?.image_url || null;

          if (!recordsMap.has(title)) {
            recordsMap.set(title, { title, imageUrl, totalMinutes: 0 });
          }
          recordsMap.get(title).totalMinutes += (Number(log.duration_minutes) || 0);
        });

        const sortedRecords = Array.from(recordsMap.values()).sort((a, b) => b.totalMinutes - a.totalMinutes);
        setMaterialRecords(sortedRecords);
      }
    };

    fetchUserData();
  }, [targetId]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  // 🌟 ダークモード用のCSS変数定義
  const bgPage = isDarkMode ? "bg-[#0a0a0a]" : "bg-slate-50";
  const bgCard = isDarkMode ? "bg-[#1c1c1e] border-[#2c2c2e]" : "bg-white border-slate-100";
  const bgSubCard = isDarkMode ? "bg-[#2c2c2e]" : "bg-slate-50";
  const textMain = isDarkMode ? "text-white" : "text-slate-800";
  const textSub = isDarkMode ? "text-slate-400" : "text-slate-400";

  if (!profile) return <div className={`min-h-screen flex items-center justify-center font-black tracking-widest animate-pulse ${bgPage} ${textSub}`}>LOADING...</div>;

  return (
    <div className={`min-h-screen p-6 font-sans transition-colors duration-300 pb-32 ${bgPage}`}>
      
      {/* 戻るボタン */}
      <button onClick={() => router.back()} className={`mb-8 p-4 rounded-full shadow-sm active:scale-95 transition-all ${bgCard}`}>
        <ArrowLeft className={`w-6 h-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`} />
      </button>

      <div className="max-w-md mx-auto space-y-6">
        
        {/* プロフィールメインカード */}
        <div className={`p-8 rounded-[3rem] shadow-sm border flex flex-col items-center transition-colors duration-300 ${bgCard}`}>
          <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center overflow-hidden mb-6 shadow-inner ${profile.avatar_url?.startsWith('bg-') ? profile.avatar_url : (isDarkMode ? 'bg-[#2c2c2e]' : 'bg-indigo-50')}`}>
            {profile.avatar_url && !profile.avatar_url.startsWith('bg-') ? (
               <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
               <span className={`text-4xl font-black ${isDarkMode ? 'text-indigo-400' : 'text-indigo-300'}`}>
                 {profile.nickname?.charAt(0).toUpperCase() || <User />}
               </span>
            )}
          </div>
          
          <h1 className={`text-3xl font-black mb-2 transition-colors ${textMain}`}>{profile.nickname || "ユーザー"}</h1>

          {/* 🌟 ここに所属バッジ（〇〇大学 3年生 など）を追加！ */}
          {getSubProfileText(profile) && (
            <div className={`mb-8 px-4 py-1.5 text-xs font-bold rounded-full ${isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
              {getSubProfileText(profile)}
            </div>
          )}
          {/* 所属バッジがない場合の余白調整 */}
          {!getSubProfileText(profile) && <div className="mb-6"></div>}

          <FollowButton targetUserId={profile.id} />
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-6 rounded-[2rem] border shadow-sm text-center transition-colors duration-300 ${bgCard}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${textSub}`}>Total Time</p>
            <p className={`text-2xl font-black ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{stats.total}<span className="text-xs ml-1">分</span></p>
          </div>
          <div className={`p-6 rounded-[2rem] border shadow-sm text-center transition-colors duration-300 ${bgCard}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${textSub}`}>Streak</p>
            <p className="text-2xl font-black text-orange-500">{stats.streak}<span className="text-xs ml-1">日</span></p>
          </div>
        </div>

        {/* 🌟 フィードエリア（Timeline / Record） */}
        <div className="pt-4 pb-12">
          
          {/* タブ切り替えボタン */}
          <div className={`flex gap-2 p-1.5 rounded-2xl mb-6 transition-colors duration-300 ${isDarkMode ? 'bg-[#2c2c2e]' : 'bg-slate-200/50'}`}>
            <button
              onClick={() => setFeedMode('timeline')}
              className={`flex-1 py-3 rounded-xl text-xs font-black tracking-widest transition-all ${
                feedMode === 'timeline' 
                  ? (isDarkMode ? 'bg-[#1c1c1e] text-indigo-400 shadow-sm' : 'bg-white text-indigo-600 shadow-sm') 
                  : (isDarkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')
              }`}
            >
              TIMELINE
            </button>
            <button
              onClick={() => setFeedMode('record')}
              className={`flex-1 py-3 rounded-xl text-xs font-black tracking-widest transition-all ${
                feedMode === 'record' 
                  ? (isDarkMode ? 'bg-[#1c1c1e] text-indigo-400 shadow-sm' : 'bg-white text-indigo-600 shadow-sm') 
                  : (isDarkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')
              }`}
            >
              RECORD
            </button>
          </div>
          
          {/* TIMELINE モードの表示 */}
          {feedMode === 'timeline' && (
            recentLogs.length === 0 ? (
              <p className={`text-center text-xs font-bold py-10 ${textSub}`}>まだ記録がありません</p>
            ) : (
              <div className="relative pl-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* タイムラインの縦線 */}
                <div className={`absolute top-2 bottom-2 left-9 w-[2px] -z-10 rounded-full transition-colors duration-300 ${isDarkMode ? 'bg-[#38383a]' : 'bg-slate-200/60'}`}></div>

                {recentLogs.map((log) => {
                  const materialData = Array.isArray(log.materials) ? log.materials[0] : log.materials;
                  return (
                    <div key={log.id} className="relative flex items-start gap-4 group">
                      {/* アイコン部分 */}
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-sm border mt-1 transition-colors duration-300 ${bgCard}`}>
                         {materialData?.image_url ? (
                           <img src={materialData.image_url} className="w-full h-full object-cover" />
                         ) : (
                           <BookOpen className={`w-5 h-5 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-300'}`} />
                         )}
                      </div>

                      {/* コンテンツ部分 */}
                      <div className={`flex-1 p-4 rounded-3xl border shadow-sm transition-colors duration-300 ${bgCard}`}>
                        <div className="flex justify-between items-start mb-2">
                          <p className={`text-sm font-black line-clamp-1 flex-1 pr-2 ${textMain}`}>{materialData?.title || "独自教材"}</p>
                          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg shrink-0 ${isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] font-black">{log.duration_minutes}分</span>
                          </div>
                        </div>
                        {log.thoughts && (
                          <p className={`text-xs font-bold mt-2 p-3 rounded-2xl line-clamp-2 transition-colors duration-300 ${bgSubCard} ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>
                            {log.thoughts}
                          </p>
                        )}
                        <p className={`text-[10px] font-black mt-3 tracking-wider ${textSub}`}>{formatDate(log.studied_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* RECORD モードの表示 */}
          {feedMode === 'record' && (
            materialRecords.length === 0 ? (
              <p className={`text-center text-xs font-bold py-10 ${textSub}`}>まだ記録がありません</p>
            ) : (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {materialRecords.map((record, index) => (
                  <div key={index} className={`p-4 rounded-3xl border shadow-sm flex items-center gap-4 transition-colors duration-300 ${bgCard}`}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden relative transition-colors duration-300 ${isDarkMode ? 'bg-[#1c1c1e] border border-[#38383a]' : 'bg-slate-50'}`}>
                      {record.imageUrl ? (
                        <img src={record.imageUrl} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className={`w-6 h-6 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-300'}`} />
                      )}
                      {index === 0 && <div className="absolute -top-1 -right-1 bg-amber-400 text-white p-1 rounded-full"><Flame className="w-3 h-3" /></div>}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-black line-clamp-1 mb-1 ${textMain}`}>{record.title}</p>
                      <p className={`text-xs font-bold ${textSub}`}>累計学習時間</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-black ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                        {record.totalMinutes}<span className={`text-xs ml-1 ${textSub}`}>分</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

        </div>
      </div>
    </div>
  );
}