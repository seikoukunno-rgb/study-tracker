'use client';

import { useState } from 'react';
import { User, Clock, BookOpen, Users, MessageSquare, LayoutGrid, Smartphone, CalendarDays, PieChart as PieChartIcon, ExternalLink } from 'lucide-react';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import Link from 'next/link'; // 🌟 リンク機能を追加

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e'];

export default function UserDetailClient({ 
  userProfile, studyRecords, studyError, calendarEvents, calendarError, materials, materialsError, groupsWithMessages, groupError, targetUserId 
}: any) {
  const [viewMode, setViewMode] = useState<'grid' | 'tabs'>('tabs');
  const [activeTab, setActiveTab] = useState<'study' | 'materials' | 'groups'>('study');

  // --- 📊 円グラフ用のデータ集計（さらに列名の総当りを強化） ---
  const getPieChartData = () => {
    if (!studyRecords || studyRecords.length === 0) return [];
    const dataMap: Record<string, number> = {};
    let totalMinutes = 0;
    
    studyRecords.forEach((record: any) => {
      // 🌟 教材名の列名をさらに広く探索
      const title = record.title || record.name || record.material_name || record.book_title || record.subject || record.label || '名称未設定';
      const minutes = Number(record.duration_minutes || record.duration || record.time || record.study_time || record.minutes || 0); 
      
      dataMap[title] = (dataMap[title] || 0) + minutes;
      totalMinutes += minutes;
    });
    
    const sortedData = Object.keys(dataMap)
      .map(key => ({ name: key, value: dataMap[key] }))
      .sort((a, b) => b.value - a.value);

    return sortedData.map((entry, index) => ({
      ...entry,
      percentage: totalMinutes > 0 ? ((entry.value / totalMinutes) * 100).toFixed(1) : 0, 
      fill: COLORS[index % COLORS.length]
    }));
  };
  const pieData = getPieChartData();

  const StudySection = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e] p-6">
        <h3 className="text-sm font-bold text-slate-500 mb-4 flex items-center gap-2"><PieChartIcon className="w-4 h-4 text-emerald-500" /> 学習割合 (時間トータル)</h3>
        {pieData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1c1c1e', borderColor: '#2c2c2e', borderRadius: '8px', color: '#fff' }} formatter={(value: any) => [`${value} 分`, '学習時間']} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} formatter={(value: any, entry: any) => `${value} (${entry.payload.percentage}%)`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-xs text-slate-400">学習記録がありません</div>
        )}
      </div>

      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e] overflow-hidden">
        {studyRecords && studyRecords.length > 0 ? (
          <ul className="divide-y divide-slate-100 dark:divide-[#2c2c2e] max-h-64 overflow-y-auto">
            {studyRecords.map((record: any) => {
              const title = record.title || record.name || record.material_name || record.book_title || '名称未設定';
              const minutes = Number(record.duration_minutes || record.duration || 0); 
              return (
                <li key={record.id} className="p-4 hover:bg-slate-50 dark:hover:bg-[#2c2c2e]/30">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">{title}</p>
                    <span className="text-xs font-bold text-indigo-500">{minutes} 分</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">{new Date(record.created_at).toLocaleString('ja-JP')}</p>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="p-8 text-center text-slate-400 text-sm font-bold">学習記録がありません</div>
        )}
      </div>
    </div>
  );

  const GroupSection = () => (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e] overflow-hidden p-2">
      {groupsWithMessages.length > 0 ? (
        <div className="space-y-2">
          {groupsWithMessages.map((group: any) => (
            // 🌟 修正：アコーディオンを廃止し、クリックで専用ページへ飛ぶカード形式に変更
            <Link 
              key={group.id} 
              href={`/admin/groups/${group.id}`}
              className="flex items-center justify-between p-5 bg-slate-50 dark:bg-[#2c2c2e]/30 rounded-xl border border-transparent hover:border-pink-500/50 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-pink-500/10 rounded-xl text-pink-500 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-black text-slate-800 dark:text-white block">{group.name || '名称未設定グループ'}</span>
                  <span className="text-[10px] text-slate-400 font-mono italic">ID: {group.id}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-pink-500 font-bold text-xs">
                ログを調査 <ExternalLink className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400 text-sm font-bold">所属しているグループがありません</div>
      )}
    </div>
  );

  return (
    <>
      {/* プロフィールヘッダー */}
      <div className="bg-white dark:bg-[#1c1c1e] p-6 md:p-8 rounded-3xl shadow-lg border border-slate-100 dark:border-[#2c2c2e] mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 shrink-0">
           <User className="w-10 h-10 md:w-12 md:h-12 text-slate-400" />
        </div>
        <div className="flex-1 text-center sm:text-left w-full">
          <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start mb-2 sm:mb-0">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white mb-1">{userProfile.nickname || '名前未設定'}</h1>
              <p className="text-[10px] md:text-xs font-mono text-slate-400 mb-2">ID: {userProfile.id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* モード切り替え */}
      <div className="flex justify-end mb-6">
        <div className="bg-slate-100 dark:bg-[#2c2c2e] p-1 rounded-xl flex gap-1">
          <button onClick={() => setViewMode('tabs')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${viewMode === 'tabs' ? 'bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white shadow-sm' : 'text-slate-500'}`}><Smartphone className="w-4 h-4" /> タブ</button>
          <button onClick={() => setViewMode('grid')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white shadow-sm' : 'text-slate-500'}`}><LayoutGrid className="w-4 h-4" /> 一覧</button>
        </div>
      </div>

      {/* コンテンツ表示 */}
      {viewMode === 'tabs' ? (
        <div className="animate-in fade-in">
          <div className="flex overflow-x-auto gap-2 mb-4 border-b border-slate-200 dark:border-[#2c2c2e] pb-2">
            <button onClick={() => setActiveTab('study')} className={`flex items-center gap-2 px-4 py-2 whitespace-nowrap border-b-2 font-bold text-sm ${activeTab === 'study' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-slate-500'}`}><Clock className="w-4 h-4" /> 学習と予定</button>
            <button onClick={() => setActiveTab('materials')} className={`flex items-center gap-2 px-4 py-2 whitespace-nowrap border-b-2 font-bold text-sm ${activeTab === 'materials' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-slate-500'}`}><BookOpen className="w-4 h-4" /> 教材履歴</button>
            <button onClick={() => setActiveTab('groups')} className={`flex items-center gap-2 px-4 py-2 whitespace-nowrap border-b-2 font-bold text-sm ${activeTab === 'groups' ? 'border-pink-500 text-pink-500' : 'border-transparent text-slate-500'}`}><Users className="w-4 h-4" /> グループ</button>
          </div>
          <div className="pt-2">
            {activeTab === 'study' && <StudySection />}
            {activeTab === 'materials' && (
              <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e] overflow-hidden">
                {materials && materials.length > 0 ? (
                  <ul className="divide-y divide-slate-100 dark:divide-[#2c2c2e] max-h-96 overflow-y-auto">
                    {materials.map((mat: any) => (
                      <li key={mat.id} className="p-4 hover:bg-slate-50 dark:hover:bg-[#2c2c2e]/30">
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{mat.title || mat.name || 'タイトルなし'}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">{new Date(mat.created_at).toLocaleString('ja-JP')}</p>
                      </li>
                    ))}
                  </ul>
                ) : <div className="p-8 text-center text-slate-400 text-sm font-bold">教材の追加履歴がありません</div>}
              </div>
            )}
            {activeTab === 'groups' && <GroupSection />}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
          <div className="space-y-8">
            <div><h2 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-indigo-500" /> 学習と予定</h2><StudySection /></div>
          </div>
          <div><h2 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-pink-500" /> 所属グループ</h2><GroupSection /></div>
        </div>
      )}
    </>
  );
}