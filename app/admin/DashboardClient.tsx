'use client';

import { useState } from 'react';
import { Users, UserPlus, Clock, BarChart3, TrendingUp, Search, ChevronLeft, ChevronRight, CalendarDays, Flame, ArrowUpDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardClient({ 
  allUsers, totalUsers, dauCount, mauCount, newUsersToday, totalStudyMinutesToday, totalStudyRecordsToday, chartData, toggleAdminRoleAction 
}: any) {
  // --- 状態管理 ---
  const [activeView, setActiveView] = useState<'overview' | 'users' | 'chart'>('overview');
  const [chartType, setChartType] = useState<'DAU' | 'MAU' | 'NewUsers'>('DAU'); // 🌟 NewUsersを追加
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'newest' | 'totalDays' | 'maxConsecutive'>('newest'); // 🌟 並び替え用の状態
  const usersPerPage = 100;

  // --- 並び替え（ソート）と検索 ---
  const sortedUsers = [...(allUsers || [])].sort((a: any, b: any) => {
    if (sortOrder === 'totalDays') return (b.total_active_days || 0) - (a.total_active_days || 0);
    if (sortOrder === 'maxConsecutive') return (b.max_consecutive_days || 0) - (a.max_consecutive_days || 0);
    // newest (新しい順)
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  const filteredUsers = sortedUsers.filter((u: any) => 
    u.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.id.includes(searchQuery)
  );
  
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage);

  // --- カードクリック処理 ---
  const handleCardClick = (type: 'users' | 'DAU' | 'MAU' | 'NewUsers') => {
    if (type === 'users') {
      setActiveView('users');
      setCurrentPage(1);
    } else {
      setChartType(type);
      setActiveView('chart');
    }
  };

  // グラフの色を出し分ける
  const getChartColor = () => {
    if (chartType === 'DAU') return '#10b981';
    if (chartType === 'MAU') return '#6366f1';
    return '#f59e0b'; // NewUsers (Amber)
  };

  return (
    <div>
      {/* 1. KPIカード */}
      <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase mb-4">1. Active Users <span className="text-xs font-normal ml-2 text-blue-500">(Click cards to see details)</span></h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div onClick={() => handleCardClick('users')} className="bg-white dark:bg-[#1c1c1e] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e] cursor-pointer hover:border-blue-500 transition-all transform hover:-translate-y-1">
          <div className="flex items-center gap-3 mb-2 text-slate-500 dark:text-slate-400"><Users className="w-5 h-5 text-blue-500" /><h3 className="text-xs font-bold">総ユーザー数</h3></div>
          <p className="text-3xl font-black text-slate-800 dark:text-white">{totalUsers}</p>
        </div>
        <div onClick={() => handleCardClick('DAU')} className="bg-white dark:bg-[#1c1c1e] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e] cursor-pointer hover:border-emerald-500 transition-all transform hover:-translate-y-1">
          <div className="flex items-center gap-3 mb-2 text-slate-500 dark:text-slate-400"><TrendingUp className="w-5 h-5 text-emerald-500" /><h3 className="text-xs font-bold">DAU (今日のログイン)</h3></div>
          <p className="text-3xl font-black text-slate-800 dark:text-white">{dauCount}</p>
        </div>
        <div onClick={() => handleCardClick('MAU')} className="bg-white dark:bg-[#1c1c1e] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e] cursor-pointer hover:border-indigo-500 transition-all transform hover:-translate-y-1">
          <div className="flex items-center gap-3 mb-2 text-slate-500 dark:text-slate-400"><BarChart3 className="w-5 h-5 text-indigo-500" /><h3 className="text-xs font-bold">MAU (今月のログイン)</h3></div>
          <p className="text-3xl font-black text-slate-800 dark:text-white">{mauCount}</p>
        </div>
        <div onClick={() => handleCardClick('NewUsers')} className="bg-white dark:bg-[#1c1c1e] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e] cursor-pointer hover:border-amber-500 transition-all transform hover:-translate-y-1">
          <div className="flex items-center gap-3 mb-2 text-slate-500 dark:text-slate-400"><UserPlus className="w-5 h-5 text-amber-500" /><h3 className="text-xs font-bold">今日の新規登録</h3></div>
          <p className="text-3xl font-black text-slate-800 dark:text-white">{newUsersToday}</p>
        </div>
      </div>

      {/* --- グラフ表示 --- */}
      {activeView === 'chart' && (
        <div className="bg-white dark:bg-[#1c1c1e] shadow-sm rounded-2xl border border-slate-100 dark:border-[#2c2c2e] p-6 mb-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              {chartType} トレンド (過去30日間)
            </h2>
            <button onClick={() => setActiveView('overview')} className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-[#38383a] transition-colors">閉じる ✕</button>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="date" stroke="#888" fontSize={12} tickMargin={10} />
                <YAxis stroke="#888" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1c1c1e', borderColor: '#2c2c2e', borderRadius: '8px', color: '#fff' }} />
                <Line type="monotone" dataKey={chartType} stroke={getChartColor()} strokeWidth={3} dot={{ r: 4, fill: '#1c1c1e', strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* --- ユーザー一覧表示 --- */}
      {activeView === 'users' && (
        <div className="bg-white dark:bg-[#1c1c1e] shadow-sm rounded-2xl border border-slate-100 dark:border-[#2c2c2e] overflow-hidden mb-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="p-6 border-b border-slate-100 dark:border-[#2c2c2e] flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">ユーザー一覧 ({filteredUsers.length}人)</h2>
                <button onClick={() => setActiveView('overview')} className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-[#38383a] transition-colors">閉じる ✕</button>
              </div>
              
              {/* 🌟 並び替えドロップダウン */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#2c2c2e]/50 px-3 py-2 rounded-xl border border-slate-200 dark:border-[#38383a]">
                <ArrowUpDown className="w-4 h-4 text-slate-400" />
                <select 
                  value={sortOrder} 
                  onChange={(e) => { setSortOrder(e.target.value as any); setCurrentPage(1); }}
                  aria-label="並び替え順を選択"
                  className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="newest">登録が新しい順</option>
                  <option value="totalDays">合計利用日数が多い順</option>
                  <option value="maxConsecutive">最大連続日数が多い順</option>
                </select>
              </div>
            </div>

            {/* 検索バー */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="名前またはIDで検索..." 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#2c2c2e]/50 border border-slate-200 dark:border-[#38383a] rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
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
                {paginatedUsers.map((u: any) => (
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
                      <form action={async () => { await toggleAdminRoleAction(u.id, u.role === 'admin' ? 'user' : 'admin'); }}>
                        <button type="submit" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
                          {u.role === 'admin' ? '降格させる' : '管理者に任命'}
                        </button>
                      </form>
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
          
          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 dark:border-[#2c2c2e] flex justify-between items-center bg-slate-50 dark:bg-[#1c1c1e]">
              <span className="text-xs text-slate-500 font-bold">全 {filteredUsers.length} 件中 {currentPage} ページ目</span>
              <div className="flex gap-2">
                <button aria-label="前のページ" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 bg-white dark:bg-[#2c2c2e] rounded-lg border border-slate-200 dark:border-[#38383a] disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-[#38383a]"><ChevronLeft className="w-4 h-4 text-slate-600 dark:text-white" /></button>
                <button aria-label="次のページ" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 bg-white dark:bg-[#2c2c2e] rounded-lg border border-slate-200 dark:border-[#38383a] disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-[#38383a]"><ChevronRight className="w-4 h-4 text-slate-600 dark:text-white" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. エンゲージメントセクション */}
      <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase mb-4 mt-8">2. Engagement & Retention</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white dark:bg-[#1c1c1e] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e] col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400"><Clock className="w-5 h-5 text-orange-500" /><h3 className="text-xs font-bold">今日のアプリ内総学習時間</h3></div>
            <span className="text-xs font-bold bg-orange-500/10 text-orange-500 px-2 py-1 rounded">記録数: {totalStudyRecordsToday}件</span>
          </div>
          <p className="text-4xl font-black text-slate-800 dark:text-white">{totalStudyMinutesToday} <span className="text-lg font-medium text-slate-400">分</span></p>
        </div>
      </div>
    </div>
  );
}