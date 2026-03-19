"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "../../../lib/supabase"; 
import { User, ArrowLeft, BookOpen, Clock, Flame } from "lucide-react";
import { useRouter } from "next/navigation";
import FollowButton from "../../../components/FollowButton"; 

export default function UserProfile({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const targetId = resolvedParams.id;

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, streak: 0 });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  
  // 🌟 追加：Recordモード用のデータ箱と、タブの切り替え状態
  const [materialRecords, setMaterialRecords] = useState<any[]>([]);
  const [feedMode, setFeedMode] = useState<'timeline' | 'record'>('timeline');

  useEffect(() => {
    const fetchUserData = async () => {
      if (!targetId) return;

      // 1. プロフィールの取得
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .single();

      if (profileData) setProfile(profileData);

      // 2. 学習ログの取得（🌟 正確な集計のため、その人の全記録を取得します）
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
        // タイムライン用には直近15件だけをセット
        setRecentLogs(allLogs.slice(0, 15));
        
        // 3. 統計（Total Time & Streak）の正確な計算
        const total = allLogs.reduce((sum, log) => sum + (Number(log.duration_minutes) || 0), 0);
        const uniqueDates = Array.from(new Set(allLogs.map(l => l.studied_at?.split('T')[0] || l.studied_at)));
        setStats({ total, streak: uniqueDates.length });

        // 🌟 4. Record用の集計（教材ごとに学習時間を合算する）
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

        // 合計時間が長い順に並び替えてセット
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

  if (!profile) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black tracking-widest text-slate-400 animate-pulse">LOADING...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <button onClick={() => router.back()} className="mb-8 p-4 bg-white rounded-full shadow-sm active:scale-95 transition-transform">
        <ArrowLeft className="w-6 h-6 text-slate-600" />
      </button>

      <div className="max-w-md mx-auto space-y-6">
        
        {/* プロフィールメインカード */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col items-center">
          <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center overflow-hidden mb-6 shadow-inner ${profile.avatar_url?.startsWith('bg-') ? profile.avatar_url : 'bg-indigo-50'}`}>
            {profile.avatar_url && !profile.avatar_url.startsWith('bg-') ? (
               <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
               <span className="text-4xl font-black text-indigo-300">{profile.nickname?.charAt(0).toUpperCase() || <User />}</span>
            )}
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-8">{profile.nickname || "ユーザー"}</h1>
          <FollowButton targetUserId={profile.id} />
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Time</p>
            <p className="text-2xl font-black text-indigo-600">{stats.total}<span className="text-xs ml-1">分</span></p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Streak</p>
            <p className="text-2xl font-black text-orange-500">{stats.streak}<span className="text-xs ml-1">日</span></p>
          </div>
        </div>

        {/* 🌟 フィードエリア（Timeline / Record） */}
        <div className="pt-4 pb-12">
          
          {/* タブ切り替えボタン */}
          <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl mb-6">
            <button
              onClick={() => setFeedMode('timeline')}
              className={`flex-1 py-3 rounded-xl text-xs font-black tracking-widest transition-all ${feedMode === 'timeline' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              TIMELINE
            </button>
            <button
              onClick={() => setFeedMode('record')}
              className={`flex-1 py-3 rounded-xl text-xs font-black tracking-widest transition-all ${feedMode === 'record' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              RECORD
            </button>
          </div>
          
          {/* 🌟 TIMELINE モードの表示 */}
          {feedMode === 'timeline' && (
            recentLogs.length === 0 ? (
              <p className="text-center text-xs font-bold text-slate-400 py-10">まだ記録がありません</p>
            ) : (
              <div className="relative pl-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="absolute top-2 bottom-2 left-9 w-[2px] bg-slate-200/60 -z-10 rounded-full"></div>

                {recentLogs.map((log) => {
                  const materialData = Array.isArray(log.materials) ? log.materials[0] : log.materials;
                  return (
                    <div key={log.id} className="relative flex items-start gap-4 group">
                      <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-sm border border-slate-100 mt-1">
                         {materialData?.image_url ? (
                           <img src={materialData.image_url} className="w-full h-full object-cover" />
                         ) : (
                           <BookOpen className="w-5 h-5 text-indigo-300" />
                         )}
                      </div>
                      <div className="flex-1 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm font-black text-slate-800 line-clamp-1 flex-1 pr-2">{materialData?.title || "独自教材"}</p>
                          <div className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg shrink-0">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] font-black">{log.duration_minutes}分</span>
                          </div>
                        </div>
                        {log.thoughts && (
                          <p className="text-xs font-bold text-slate-500 mt-2 bg-slate-50 p-3 rounded-2xl line-clamp-2">{log.thoughts}</p>
                        )}
                        <p className="text-[10px] font-black text-slate-400 mt-3 tracking-wider">{formatDate(log.studied_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* 🌟 RECORD モードの表示 */}
          {feedMode === 'record' && (
            materialRecords.length === 0 ? (
              <p className="text-center text-xs font-bold text-slate-400 py-10">まだ記録がありません</p>
            ) : (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {materialRecords.map((record, index) => (
                  <div key={index} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden relative">
                      {record.imageUrl ? (
                        <img src={record.imageUrl} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-6 h-6 text-indigo-300" />
                      )}
                      {/* 王冠や順位バッジをつけるとおしゃれ */}
                      {index === 0 && <div className="absolute -top-1 -right-1 bg-amber-400 text-white p-1 rounded-full"><Flame className="w-3 h-3" /></div>}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-800 line-clamp-1 mb-1">{record.title}</p>
                      <p className="text-xs font-bold text-slate-400">累計学習時間</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-indigo-600">{record.totalMinutes}<span className="text-xs ml-1 text-slate-400">分</span></p>
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