import { createClient } from '../utils/supabase/server';
// redirect を使わないため削除しました
import { toggleAdminRole } from '../actions/admin';
import { Users, Shield, Activity } from 'lucide-react';

export default async function AdminPage() {
  const supabase = await createClient();
  
  // 1. ログインユーザーの取得
  const { data: { user } } = await supabase.auth.getUser();
  
  // 🚨 探知機1：ユーザー情報がない場合
  if (!user) {
    return (
      <div className="p-20 text-center">
        <h1 className="text-3xl font-black text-red-500 mb-4">🚨 エラー：未ログイン判定</h1>
        <p className="text-slate-700">サーバー側にログインのクッキーが届いていません。</p>
      </div>
    );
  }

  // 2. プロフィールの取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // 🚨 探知機2：管理者ではない（またはデータが取れていない）場合
  if (profile?.role !== 'admin') {
    return (
      <div className="p-20 text-center">
        <h1 className="text-3xl font-black text-red-500 mb-4">🚨 エラー：管理者権限なし</h1>
        <p className="text-slate-700 font-bold mb-2">あなたのID: {user.id}</p>
        <p className="text-slate-700 font-bold">
          DBから取得したrole: <span className="text-blue-600">{profile?.role || 'null（取得失敗）'}</span>
        </p>
      </div>
    );
  }

  // --------------------------------------------------------
  // ここから下は元のコードと同じ（データ取得とUI表示）です
  // --------------------------------------------------------
  const [
    { data: allUsers },
    { count: totalUsers },
    { count: adminUsers }
  ] = await Promise.all([
    supabase.from('profiles').select('id, nickname, role, email').order('created_at', { ascending: false }),
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
                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#2c2c2e]">
              {allUsers?.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-[#2c2c2e]/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-slate-800 dark:text-white">{u.nickname || '未設定'}</div>
                    <div className="text-xs text-slate-400">{u.id.substring(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase ${u.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                      {u.role}
                    </span>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}