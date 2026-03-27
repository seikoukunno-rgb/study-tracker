import { createClient } from '../../../utils/supabase/server';
import { redirect } from 'next/navigation';
import { Shield, ArrowLeft, Calendar, User, Target } from 'lucide-react';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) { // 🌟 型を Promise で囲む
  const supabase = await createClient();
  const resolvedParams = await params; // 🌟 await で中身を取り出す
  const targetUserId = resolvedParams.id;

  // 1. 【防衛ライン】アクセスしてきた本人が管理者かチェック
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) redirect('/login');

  const { data: requesterProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();

  if (requesterProfile?.role !== 'admin') redirect('/');

  // 2. 【データ取得】ターゲットユーザーのプロフィールと予定を取得
  // プロフィール情報
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', targetUserId)
    .single();

  if (!userProfile) {
    return <div className="p-8 text-white">ユーザーが見つかりませんでした。</div>;
  }

  // 予定・学習履歴（calendar_eventsテーブルから取得）
  const { data: userEvents } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('student_id', targetUserId)
    .order('created_at', { ascending: false })
    .limit(10); // 最新の10件だけ取得

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <a href="/admin" className="text-slate-500 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> ダッシュボードに戻る
        </a>
      </div>

      <div className="bg-white dark:bg-[#1c1c1e] p-8 rounded-3xl shadow-lg border border-slate-100 dark:border-[#2c2c2e] mb-8 flex items-start gap-6">
        <div className={`w-24 h-24 rounded-2xl flex items-center justify-center shadow-inner overflow-hidden shrink-0 ${userProfile.avatar_url?.startsWith('bg-') ? userProfile.avatar_url : 'bg-slate-200 dark:bg-slate-800'}`}>
           <User className="w-12 h-12 text-slate-400" />
        </div>
        
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-1">
                {userProfile.nickname || '名前未設定'}
              </h1>
              <p className="text-xs font-mono text-slate-400 mb-4">ID: {userProfile.id}</p>
            </div>
            {userProfile.role === 'admin' && (
              <span className="px-3 py-1 bg-red-500/20 text-red-500 rounded-full text-xs font-black tracking-widest uppercase flex items-center gap-1">
                <Shield className="w-3 h-3" /> ADMIN
              </span>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-[#2c2c2e]/50 p-4 rounded-xl border border-slate-100 dark:border-[#38383a]">
            <p className="text-xs font-black text-indigo-500/70 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Target className="w-3 h-3" /> Current Goal
            </p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {/* ※もしプロフィールにgoalカラムがあればここに表示。現状はプレースホルダー */}
              ユーザーの目標（未設定）
            </p>
          </div>
        </div>
      </div>

      {/* --- 学習履歴 / カレンダー予定 --- */}
      <h2 className="text-xl font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-indigo-500" /> 最新の登録イベント (10件)
      </h2>
      
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e] overflow-hidden">
        {userEvents && userEvents.length > 0 ? (
          <ul className="divide-y divide-slate-100 dark:divide-[#2c2c2e]">
            {userEvents.map((event: any) => (
              <li key={event.id} className="p-4 hover:bg-slate-50 dark:hover:bg-[#2c2c2e]/30 transition-colors">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">{event.title}</p>
                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${event.is_completed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    {event.is_completed ? '完了' : '未完了'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  {new Date(event.created_at).toLocaleString('ja-JP')}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-8 text-center text-slate-400 text-sm font-bold">
            まだ学習イベントや予定が登録されていません。
          </div>
        )}
      </div>

    </div>
  );
}