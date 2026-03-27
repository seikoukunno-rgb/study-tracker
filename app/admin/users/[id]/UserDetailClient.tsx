'use client';

import { useState } from 'react';
import { User, Clock, BookOpen, Users, MessageSquare, LayoutGrid, Smartphone } from 'lucide-react';

export default function UserDetailClient({ 
  userProfile, studyRecords, studyError, materials, materialsError, roomsWithMessages, roomError, targetUserId 
}: any) {
  // 🌟 モード切り替えの状態管理（初期値はタブモード）
  const [viewMode, setViewMode] = useState<'grid' | 'tabs'>('tabs');
  const [activeTab, setActiveTab] = useState<'study' | 'materials' | 'rooms'>('study');

  // 各セクションの中身を部品（コンポーネント）化
  const StudySection = () => (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e] overflow-hidden">
      {studyError ? (
        <div className="p-4 text-xs text-red-500">※学習記録のテーブル名が違うため取得できません。</div>
      ) : studyRecords && studyRecords.length > 0 ? (
        <ul className="divide-y divide-slate-100 dark:divide-[#2c2c2e] max-h-96 overflow-y-auto">
          {studyRecords.map((record: any) => (
            <li key={record.id} className="p-4 hover:bg-slate-50 dark:hover:bg-[#2c2c2e]/30">
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">{record.title || record.name || 'タイトルなし'}</p>
                <span className="text-xs font-bold text-indigo-500">{record.duration_minutes || 0} 分</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">{new Date(record.created_at).toLocaleString('ja-JP')}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-8 text-center text-slate-400 text-sm font-bold">記録がありません</div>
      )}
    </div>
  );

  const MaterialSection = () => (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e] overflow-hidden">
      {materialsError ? (
        <div className="p-4 text-xs text-slate-500">※教材テーブルが存在しないか、データがありません。</div>
      ) : materials && materials.length > 0 ? (
        <ul className="divide-y divide-slate-100 dark:divide-[#2c2c2e] max-h-96 overflow-y-auto">
          {materials.map((mat: any) => (
            <li key={mat.id} className="p-4 hover:bg-slate-50 dark:hover:bg-[#2c2c2e]/30">
              <p className="text-sm font-bold text-slate-800 dark:text-white">{mat.title || mat.name || 'タイトルなし'}</p>
              <p className="text-[10px] text-slate-400 font-mono mt-1">{new Date(mat.created_at).toLocaleString('ja-JP')}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-8 text-center text-slate-400 text-sm font-bold">教材の追加履歴がありません</div>
      )}
    </div>
  );

  const RoomSection = () => (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-slate-100 dark:border-[#2c2c2e] overflow-hidden p-2">
      {roomError ? (
        <div className="p-4 text-xs text-slate-500">※ルーム機能のテーブル構成が異なるため取得できません。</div>
      ) : roomsWithMessages.length > 0 ? (
        <div className="space-y-2">
          {roomsWithMessages.map((room: any) => (
            <details key={room.id} className="group bg-slate-50 dark:bg-[#2c2c2e]/30 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#38383a] transition-colors list-none">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-pink-500" />
                  <span className="font-bold text-sm text-slate-800 dark:text-white">{room.name || '名称未設定ルーム'}</span>
                </div>
                <span className="text-xs text-slate-400 group-open:hidden">会話を表示 ▼</span>
                <span className="text-xs text-slate-400 hidden group-open:block">閉じる ▲</span>
              </summary>
              <div className="p-4 border-t border-slate-100 dark:border-[#38383a] bg-white dark:bg-[#1c1c1e] max-h-[400px] overflow-y-auto flex flex-col-reverse gap-3">
                {room.messages.length > 0 ? (
                  room.messages.map((msg: any) => {
                    const isTargetUser = msg.user_id === targetUserId;
                    return (
                      <div key={msg.id} className={`flex flex-col max-w-[85%] ${isTargetUser ? 'self-end items-end' : 'self-start items-start'}`}>
                        <span className="text-[10px] text-slate-400 mb-1">{msg.profiles?.nickname || '不明なユーザー'}</span>
                        <div className={`px-4 py-2 rounded-2xl text-sm ${isTargetUser ? 'bg-indigo-500 text-white rounded-br-sm' : 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-800 dark:text-white rounded-bl-sm'}`}>
                          {msg.content}
                        </div>
                        <span className="text-[9px] text-slate-400 mt-1">{new Date(msg.created_at).toLocaleString('ja-JP')}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-xs text-slate-400 py-4">メッセージがありません</div>
                )}
              </div>
              <div className="p-3 bg-slate-100 dark:bg-[#2c2c2e]/80 text-center text-xs text-slate-500 font-bold border-t border-slate-200 dark:border-[#38383a]">
                🚨 調査モード（閲覧のみ）
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400 text-sm font-bold">所属しているルームがありません</div>
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
              <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white mb-1">
                {userProfile.nickname || '名前未設定'}
              </h1>
              <p className="text-[10px] md:text-xs font-mono text-slate-400 mb-2">ID: {userProfile.id}</p>
            </div>
            {userProfile.role === 'admin' && (
              <span className="px-3 py-1 bg-red-500/20 text-red-500 rounded-full text-[10px] md:text-xs font-black tracking-widest uppercase">ADMIN</span>
            )}
          </div>
          <div className="flex justify-center sm:justify-start gap-4 mt-2">
            <span className="text-xs md:text-sm font-bold text-slate-600 dark:text-slate-300">合計利用: {userProfile.total_active_days || 0}日</span>
            <span className="text-xs md:text-sm font-bold text-orange-600 dark:text-orange-400">最大連続: {userProfile.max_consecutive_days || 0}日</span>
          </div>
        </div>
      </div>

      {/* 🌟 モード切り替えスイッチ */}
      <div className="flex justify-end mb-6">
        <div className="bg-slate-100 dark:bg-[#2c2c2e] p-1 rounded-xl flex gap-1">
          <button onClick={() => setViewMode('tabs')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${viewMode === 'tabs' ? 'bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            <Smartphone className="w-4 h-4" /> タブ (スマホ推奨)
          </button>
          <button onClick={() => setViewMode('grid')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            <LayoutGrid className="w-4 h-4" /> 一覧 (PC推奨)
          </button>
        </div>
      </div>

      {/* 🌟 タブモード (スマホ用) */}
      {viewMode === 'tabs' && (
        <div className="animate-in fade-in">
          <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-4 border-b border-slate-200 dark:border-[#2c2c2e] pb-2">
            <button onClick={() => setActiveTab('study')} className={`flex items-center gap-2 px-4 py-2 whitespace-nowrap border-b-2 font-bold text-sm transition-colors ${activeTab === 'study' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Clock className="w-4 h-4" /> 学習記録
            </button>
            <button onClick={() => setActiveTab('materials')} className={`flex items-center gap-2 px-4 py-2 whitespace-nowrap border-b-2 font-bold text-sm transition-colors ${activeTab === 'materials' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <BookOpen className="w-4 h-4" /> 教材履歴
            </button>
            <button onClick={() => setActiveTab('rooms')} className={`flex items-center gap-2 px-4 py-2 whitespace-nowrap border-b-2 font-bold text-sm transition-colors ${activeTab === 'rooms' ? 'border-pink-500 text-pink-500' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Users className="w-4 h-4" /> ルームと会話
            </button>
          </div>
          <div className="pt-2">
            {activeTab === 'study' && <StudySection />}
            {activeTab === 'materials' && <MaterialSection />}
            {activeTab === 'rooms' && <RoomSection />}
          </div>
        </div>
      )}

      {/* 🌟 一覧モード (PC用) */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-indigo-500" /> 学習記録</h2>
              <StudySection />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5 text-emerald-500" /> 追加した教材履歴</h2>
              <MaterialSection />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-pink-500" /> 所属ルームと会話ログ</h2>
            <RoomSection />
          </div>
        </div>
      )}
    </>
  );
}