'use client';

import { useState } from 'react';
import { User, Clock, BookOpen, Users, LayoutGrid, Smartphone, CalendarDays, PieChart as PieChartIcon, MessageSquare, UserPlus, ChevronRight, ShieldAlert } from 'lucide-react';
// 🌟 Legend のインポートは残していても問題ありませんが、使用箇所を削除しました
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Link from 'next/link';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e'];

const getSubProfileText = (profile: any) => {
  if (!profile) return '';
  if (profile.user_type === 'student') {
    const uni = profile.university || '';
    const grade = profile.grade || '';
    return `${uni} ${grade}`.trim() || '学生';
  } else if (profile.user_type === 'worker') {
    return profile.occupation || '社会人・その他';
  }
  return '未設定';
};

export default function UserDetailClient({ userProfile, studyRecords, calendarEvents, materials, groupsWithMessages, followers, following, targetUserId }: any) {
  const [viewMode, setViewMode] = useState<'grid' | 'tabs'>('tabs');
  const [activeTab, setActiveTab] = useState<'study' | 'materials' | 'groups' | 'connections'>('study');

  const getRecordTitle = (record: any) => {
    if (record.title || record.name || record.subject) return record.title || record.name || record.subject;
    const linkedMaterial = materials?.find((m: any) => m.id === record.material_id || m.id === record.book_id);
    if (linkedMaterial) return linkedMaterial.name || linkedMaterial.title;
    return '名称未設定';
  };

  const getPieChartData = () => {
    if (!studyRecords || studyRecords.length === 0) return [];
    const dataMap: Record<string, number> = {};
    let totalMinutes = 0;
    
    studyRecords.forEach((record: any) => {
      const title = getRecordTitle(record); 
      const minutes = Number(record.duration_minutes || record.duration || record.time || 0); 
      dataMap[title] = (dataMap[title] || 0) + minutes;
      totalMinutes += minutes;
    });
    
    const sortedData = Object.keys(dataMap).map(key => ({ name: key, value: dataMap[key] })).sort((a, b) => b.value - a.value);
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
                {/* 🌟 修正ポイント: labelは無し、Legendコンポーネントも削除してスッキリさせました */}
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" nameKey="name">
                  {pieData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                </Pie>
                {/* ホバー時（タップ時）のツールチップのみ残しています */}
                <Tooltip contentStyle={{ backgroundColor: '#1c1c1e', borderRadius: '8px', color: '#fff', border: '1px solid #333' }} formatter={(value: any, name: any) => [`${value} 分`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="h-32 flex items-center justify-center text-xs text-slate-400">記録なし</div>}
      </div>

      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e] overflow-hidden">
        {studyRecords && studyRecords.length > 0 ? (
          <ul className="divide-y divide-slate-100 dark:divide-[#2c2c2e] max-h-64 overflow-y-auto">
            {studyRecords.map((record: any) => (
              <li key={record.id} className="p-4 hover:bg-slate-50 dark:hover:bg-[#2c2c2e]/30">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">{getRecordTitle(record)}</p>
                  <span className="text-xs font-bold text-indigo-500">{record.duration_minutes || record.duration || 0} 分</span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">{new Date(record.created_at).toLocaleString('ja-JP')}</p>
              </li>
            ))}
          </ul>
        ) : <div className="p-8 text-center text-slate-400 text-sm font-bold">学習記録がありません</div>}
      </div>
    </div>
  );

  const GroupSection = () => (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e] overflow-hidden p-2">
      {groupsWithMessages.length > 0 ? (
        <div className="space-y-2">
          {groupsWithMessages.map((group: any) => (
            <details key={group.id} className="group bg-slate-50 dark:bg-[#2c2c2e]/30 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden border border-transparent hover:border-pink-500/50 transition-all">
              <summary className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 cursor-pointer list-none gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink-500/10 rounded-lg"><MessageSquare className="w-4 h-4 text-pink-500" /></div>
                  <div>
                    <span className="font-black text-sm text-slate-800 dark:text-white block">{group.name || '名称未設定グループ'}</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {group.members?.map((m: any, idx: number) => (
                        <span key={idx} className="text-[9px] px-1.5 py-0.5 bg-slate-200 dark:bg-[#38383a] text-slate-600 dark:text-slate-300 rounded">
                          {m.profiles?.nickname || '不明'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-pink-500 font-bold group-open:hidden self-end sm:self-auto shrink-0">チャットを見る ▼</span>
                <span className="text-xs text-pink-500 font-bold hidden group-open:block self-end sm:self-auto shrink-0">閉じる ▲</span>
              </summary>
              <div className="p-4 border-t border-slate-100 dark:border-[#38383a] bg-white dark:bg-[#1c1c1e] max-h-[400px] overflow-y-auto flex flex-col-reverse gap-3">
                {group.messages.length > 0 ? (
                  group.messages.map((msg: any) => {
                    const isTargetUser = msg.user_id === targetUserId;
                    return (
                      <div key={msg.id} className={`flex flex-col max-w-[85%] ${isTargetUser ? 'self-end items-end' : 'self-start items-start'}`}>
                        <span className="text-[10px] text-slate-400 mb-1">{msg.profiles?.nickname || 'ユーザー'}</span>
                        <div className={`px-4 py-2 rounded-2xl text-sm ${isTargetUser ? 'bg-indigo-500 text-white rounded-br-sm' : 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-800 dark:text-white rounded-bl-sm'}`}>
                          {msg.content}
                        </div>
                        <span className="text-[9px] text-slate-400 mt-1">{new Date(msg.created_at).toLocaleString('ja-JP')}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-xs text-slate-400 py-4">
                    {group.msgError ? `🚨 エラー: ${group.msgError}` : 'メッセージがありません'}
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400 text-sm font-bold">所属しているグループがありません</div>
      )}
    </div>
  );

  const ConnectionsSection = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e] overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-[#2c2c2e] bg-slate-50 dark:bg-[#2c2c2e]/30">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">フォロワー ({followers?.length || 0}人)</h3>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-[#2c2c2e] max-h-64 overflow-y-auto">
          {followers && followers.length > 0 ? followers.map((f: any, i: number) => (
            <li key={i}>
              <Link href={`/admin/users/${f.id}`} className="p-4 hover:bg-slate-50 dark:hover:bg-[#2c2c2e]/30 flex items-center justify-between transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#38383a] flex items-center justify-center"><User className="w-4 h-4 text-slate-400" /></div>
                  <span className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-blue-500 transition-colors">{f.nickname}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </Link>
            </li>
          )) : <li className="p-8 text-center text-slate-400 text-sm font-bold">フォロワーはいません</li>}
        </ul>
      </div>

      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e] overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-[#2c2c2e] bg-slate-50 dark:bg-[#2c2c2e]/30">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">フォロー中 ({following?.length || 0}人)</h3>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-[#2c2c2e] max-h-64 overflow-y-auto">
          {following && following.length > 0 ? following.map((f: any, i: number) => (
            <li key={i}>
              <Link href={`/admin/users/${f.id}`} className="p-4 hover:bg-slate-50 dark:hover:bg-[#2c2c2e]/30 flex items-center justify-between transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#38383a] flex items-center justify-center"><User className="w-4 h-4 text-slate-400" /></div>
                  <span className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-blue-500 transition-colors">{f.nickname}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </Link>
            </li>
          )) : <li className="p-8 text-center text-slate-400 text-sm font-bold">フォローしていません</li>}
        </ul>
      </div>
    </div>
  );

  return (
    <>
      <div className="bg-white dark:bg-[#1c1c1e] p-6 md:p-8 rounded-3xl shadow-lg border border-slate-100 dark:border-[#2c2c2e] mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 shrink-0">
          <User className="w-10 h-10 md:w-12 md:h-12 text-slate-400" />
        </div>
        
        <div className="flex-1 text-center sm:text-left w-full">
          <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start mb-2 sm:mb-0 w-full">
            <div>
              <div className="flex items-baseline justify-center sm:justify-start gap-3 mb-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">
                  {userProfile.nickname || '名前未設定'}
                </h1>
                {userProfile.age && (
                  <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{userProfile.age}歳</span>
                )}
              </div>
              
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mb-3">
                <p className="text-[10px] md:text-xs font-mono text-slate-400">ID: {userProfile.id}</p>
                
                {userProfile.real_name && (
                  <div className="px-2 py-0.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black rounded border border-rose-100 dark:border-rose-500/20 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> 本名: {userProfile.real_name}
                  </div>
                )}

                <div className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded border border-indigo-100 dark:border-indigo-500/20">
                  {getSubProfileText(userProfile)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center sm:justify-start gap-4 mt-2">
            <span className="text-xs md:text-sm font-bold text-slate-600 dark:text-slate-300">フォロワー: <span className="text-blue-500">{followers?.length || 0}</span></span>
            <span className="text-xs md:text-sm font-bold text-slate-600 dark:text-slate-300">フォロー中: <span className="text-blue-500">{following?.length || 0}</span></span>
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-6">
        <div className="bg-slate-100 dark:bg-[#2c2c2e] p-1 rounded-xl flex gap-1">
          <button onClick={() => setViewMode('tabs')} className={`px-4 py-2 rounded-lg text-xs font-bold ${viewMode === 'tabs' ? 'bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white shadow-sm' : 'text-slate-500'}`}><Smartphone className="w-4 h-4 inline mr-2" /> タブ</button>
          <button onClick={() => setViewMode('grid')} className={`px-4 py-2 rounded-lg text-xs font-bold ${viewMode === 'grid' ? 'bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white shadow-sm' : 'text-slate-500'}`}><LayoutGrid className="w-4 h-4 inline mr-2" /> 一覧</button>
        </div>
      </div>

      <div className="animate-in fade-in">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-4 border-b border-slate-200 dark:border-[#2c2c2e] pb-2">
          <button onClick={() => setActiveTab('study')} className={`px-4 py-2 whitespace-nowrap font-bold text-sm ${activeTab === 'study' ? 'border-b-2 border-indigo-500 text-indigo-500' : 'text-slate-500'}`}><Clock className="w-4 h-4 inline mr-1" /> 学習と予定</button>
          <button onClick={() => setActiveTab('materials')} className={`px-4 py-2 whitespace-nowrap font-bold text-sm ${activeTab === 'materials' ? 'border-b-2 border-emerald-500 text-emerald-500' : 'text-slate-500'}`}><BookOpen className="w-4 h-4 inline mr-1" /> 教材履歴</button>
          <button onClick={() => setActiveTab('groups')} className={`px-4 py-2 whitespace-nowrap font-bold text-sm ${activeTab === 'groups' ? 'border-b-2 border-pink-500 text-pink-500' : 'text-slate-500'}`}><Users className="w-4 h-4 inline mr-1" /> グループ</button>
          <button onClick={() => setActiveTab('connections')} className={`px-4 py-2 whitespace-nowrap font-bold text-sm ${activeTab === 'connections' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-slate-500'}`}><UserPlus className="w-4 h-4 inline mr-1" /> つながり</button>
        </div>

        {activeTab === 'study' && <StudySection />}
        {activeTab === 'materials' && (
           <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e] overflow-hidden">
             {materials && materials.length > 0 ? (
                <ul className="divide-y divide-slate-100 dark:divide-[#2c2c2e] max-h-96 overflow-y-auto">
                  {materials.map((m: any) => (
                    <li key={m.id} className="p-4 hover:bg-slate-50 dark:hover:bg-[#2c2c2e]/30">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{m.name || m.title || 'タイトルなし'}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-1">{new Date(m.created_at).toLocaleString('ja-JP')}</p>
                    </li>
                  ))}
                </ul>
              ) : <div className="p-8 text-center text-slate-400 text-sm font-bold">教材の追加履歴がありません</div>}
           </div>
        )}
        {activeTab === 'groups' && <GroupSection />}
        {activeTab === 'connections' && <ConnectionsSection />}
      </div>
    </>
  );
}