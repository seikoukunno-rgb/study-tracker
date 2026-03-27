import { createClient } from '../utils/supabase/server';
import { redirect } from 'next/navigation';
import { toggleAdminRole } from '../actions/admin';
import { Users, Shield, Activity, UserPlus, Clock, BarChart3, TrendingUp, CalendarDays, Flame } from 'lucide-react';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/');

  // --- 📅 日付の準備 ---
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const firstDayOfMonthStr = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  
  // --- 📊 データの取得（並行処理で爆速化） ---
  const [
    { data: allUsers },
    { count: totalUsers },
    { count: adminUsers },
    { count: newUsersToday },
    { count: dauCount },
    { data: mauData },
    { data: todayStudyRecords }
  ] = await Promise.all([
    supabase.from('profiles').select('*'), // ユーザー一覧
    supabase.from('profiles').select('*', { count: 'exact', head: true }), // 総ユーザー
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'), // 管理者数
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', `${todayStr}T00:00:00Z`), // 今日の新規登録
    supabase.from('activity_logs').select('*', { count: 'exact', head: true }).eq('active_date', todayStr), // DAU
    supabase.from('activity_logs').select('user_id').gte('active_date', firstDayOfMonthStr), // MAU（後で重複排除）
    supabase.from('study_records').select('duration_minutes').gte('created_at', `${todayStr}T00:00:00Z`) // 今日の学習時間
  ]);

  // --- 🧮 KPIの計算 ---
  // MAUの計算（同じ人が何日もログインしている重複を弾く）
  const uniqueMauSet = new Set(mauData?.map(log => log.user_id));
  const mauCount = uniqueMauSet.size;

  // エンゲージメント（今日の合計学習時間と投稿数）
  const totalStudyMinutesToday = todayStudyRecords?.reduce((sum, record) => sum + (record.duration_minutes || 0), 0) || 0;
  const totalStudyRecordsToday = todayStudyRecords?.length || 0;

  // ※定着率（リテンション）は分母となる3日前/7日前の登録者データが蓄積されてから機能します。今回はプレースホルダーとしてUIに組み込みます。

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-black mb-8 text-slate-800 dark:text-white flex items-center gap-3">
        <Activity className="w-8 h-8 text-indigo-500" />
        Growth Dashboard
      </h1>
      
      {/* =========================================
          📈 1. アクティブユーザー指標 (Acquisition & Activation)
          ========================================= */}
      <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase mb-4">1. Active Users</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-[#1c1c1e] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e]">
          <div className="flex items-center gap-3 mb-2 text-slate-500 dark:text-slate-400"><Users className="w-5 h-5 text-blue-500" /><h3 className="text-xs font-bold">総ユーザー数</h3></div>
          <p className="text-3xl font-black text-slate-800 dark:text-white">{totalUsers || 0}</p>
        </div>
        <div className="bg-white dark:bg-[#1c1c1e] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e]">
          <div className="flex items-center gap-3 mb-2 text-slate-500 dark:text-slate-400"><TrendingUp className="w-5 h-5 text-emerald-500" /><h3 className="text-xs font-bold">DAU (今日のログイン)</h3></div>
          <p className="text-3xl font-black text-slate-800 dark:text-white">{dauCount || 0}</p>
        </div>
        <div className="bg-white dark:bg-[#1c1c1e] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e]">
          <div className="flex items-center gap-3 mb-2 text-slate-500 dark:text-slate-400"><BarChart3 className="w-5 h-5 text-indigo-500" /><h3 className="text-xs font-bold">MAU (今月のログイン)</h3></div>
          <p className="text-3xl font-black text-slate-800 dark:text-white">{mauCount || 0}</p>
        </div>
        <div className="bg-white dark:bg-[#1c1c1e] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e]">
          <div className="flex items-center gap-3 mb-2 text-slate-500 dark:text-slate-400"><UserPlus className="w-5 h-5 text-amber-500" /><h3 className="text-xs font-bold">今日の新規登録</h3></div>
          <p className="text-3xl font-black text-slate-800 dark:text-white">{newUsersToday || 0}</p>
        </div>
      </div>

      {/* =========================================
          🔥 2. エンゲージメント & 定着率 (Engagement & Retention)
          ========================================= */}
      <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase mb-4">2. Engagement & Retention</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white dark:bg-[#1c1c1e] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e] col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400"><Clock className="w-5 h-5 text-orange-500" /><h3 className="text-xs font-bold">今日のアプリ内総学習時間</h3></div>
            <span className="text-xs font-bold bg-orange-500/10 text-orange-500 px-2 py-1 rounded">記録数: {totalStudyRecordsToday}件</span>
          </div>
          <p className="text-4xl font-black text-slate-800 dark:text-white">{totalStudyMinutesToday} <span className="text-lg font-medium text-slate-400">分</span></p>
        </div>
        
        <div className="bg-white dark:bg-[#1c1c1e] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e]">
          <div className="flex items-center gap-3 mb-2 text-slate-500 dark:text-slate-400"><Users className="w-5 h-5 text-pink-500" /><h3 className="text-xs font-bold">Day 3 定着率</h3></div>
          <p className="text-3xl font-black text-slate-800 dark:text-white">-- <span className="text-lg font-medium text-slate-400">%</span></p>
          <p className="text-[10px] text-slate-400 mt-2">データ蓄積中...</p>
        </div>

        <div className="bg-white dark:bg-[#1c1c1e] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e]">
          <div className="flex items-center gap-3 mb-2 text-slate-500 dark:text-slate-400"><Users className="w-5 h-5 text-rose-500" /><h3 className="text-xs font-bold">Day 7 定着率</h3></div>
          <p className="text-3xl font-black text-slate-800 dark:text-white">-- <span className="text-lg font-medium text-slate-400">%</span></p>
          <p className="text-[10px] text-slate-400 mt-2">データ蓄積中...</p>
        </div>
      </div>

      {/* =========================================
          🧑‍💻 3. ユーザー管理 (Users Management)
          ========================================= */}
      <div className="bg-white dark:bg-[#1c1c1e] shadow-sm rounded-2xl border border-slate-100 dark:border-[#2c2c2e] overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-[#2c2c2e] flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">ユーザー一覧 ({totalUsers}人)</h2>
          <span className="px-3 py-1 bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 rounded-full text-xs font-bold">管理者: {adminUsers}人</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-[#2c2c2e]">
            <thead className="bg-slate-50 dark:bg-[#2c2c2e]/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">ユーザー</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">権限</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">利用状況</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">操作</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">詳細</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#2c2c2e]">
              {allUsers?.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-[#2c2c2e]/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-slate-800 dark:text-white">{u.nickname || '未設定'}</div>
                    <div className="text-xs text-slate-400 font-mono">{u.id.substring(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase ${u.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
                        合計: {u.total_active_days || 0}日
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <Flame className="w-3.5 h-3.5 text-orange-500" />
                        最大連続: {u.max_consecutive_days || 0}日
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {u.id !== user?.id && (
                      <form action={async () => {
                        'use server'
                        await toggleAdminRole(u.id, u.role === 'admin' ? 'user' : 'admin');
                      }}>
                        <button className="text-sm font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
                          {u.role === 'admin' ? '降格させる' : '管理者に任命'}
                        </button>
                      </form>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <a href={`/admin/users/${u.id}`} className="text-sm font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                      詳細を見る ➔
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}