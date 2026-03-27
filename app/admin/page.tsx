import { createClient } from '../utils/supabase/server';
import { redirect } from 'next/navigation';
import { toggleAdminRole } from '../actions/admin';
// 🌟 修正1：Flame（炎）とCalendarDays（カレンダー）のアイコンを追加
import { Users, Shield, Activity, Flame, CalendarDays } from 'lucide-react'; 

export default async function AdminPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/');

  // エラー回避のため .order() は外し、シンプルに取得しています
  const [
    { data: allUsers },
    { count: totalUsers },
    { count: adminUsers }
  ] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin')
  ]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-black mb-8 text-slate-800 dark:text-white flex items-center gap-3">
        <Shield className="w-8 h-8 text-red-500" />
        Owner Dashboard
      </h1>
      
      {/* --- KPIカードセクション --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e]">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400">総ユーザー数</h3>
          </div>
          <p className="text-4xl font-black text-slate-800 dark:text-white">{totalUsers || 0} <span className="text-base font-medium text-slate-400">人</span></p>
        </div>

        <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e]">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-xl text-red-600 dark:text-red-400">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400">管理者数</h3>
          </div>
          <p className="text-4xl font-black text-slate-800 dark:text-white">{adminUsers || 0} <span className="text-base font-medium text-slate-400">人</span></p>
        </div>

        <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e]">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400">本日のアクティブ（準備中）</h3>
          </div>
          <p className="text-4xl font-black text-slate-300 dark:text-slate-600">--</p>
        </div>
      </div>

      {/* --- ユーザー管理テーブルセクション --- */}
      <div className="bg-white dark:bg-[#1c1c1e] shadow-sm rounded-2xl border border-slate-100 dark:border-[#2c2c2e] overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-[#2c2c2e]">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">ユーザー管理</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-[#2c2c2e]">
            <thead className="bg-slate-50 dark:bg-[#2c2c2e]/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">ユーザー</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">権限</th>
                {/* 🌟 修正2：利用状況の列見出しを追加 */}
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
                  
                  {/* 🌟 修正3：利用状況のデータを表示 */}
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
                    <a 
                      href={`/admin/users/${u.id}`} 
                      className="text-sm font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
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