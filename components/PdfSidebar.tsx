// components/PdfSidebar.tsx
'use client';

import { useState } from 'react';
import { Timer, ChevronDown, ChevronUp, Play, Square, Pause, Plus } from 'lucide-react';

type PdfSidebarProps = {
  onNoteClick: (pageNumber: number) => void;
};

// 🌟 テスト用の過去メモデータ
const DUMMY_NOTES = [
  { id: 1, page: 3, date: '2026/03/19', content: 'ここにメモした内容が入ります。クリックでスライド！' },
  { id: 2, page: 12, date: '2026/03/18', content: '第2章の重要な公式について。' },
];

export default function PdfSidebar({ onNoteClick }: PdfSidebarProps) {
  // タイマーの開閉状態を管理
  const [isTimerOpen, setIsTimerOpen] = useState(true);

  return (
    <div className="w-80 bg-[#1c1c1e] border-l border-[#2c2c2e] h-full flex flex-col text-white">
      
      {/* ⏱️ 収納式タイマーパネル */}
      <div className="border-b border-[#2c2c2e]">
        <button 
          onClick={() => setIsTimerOpen(!isTimerOpen)}
          className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            <Timer className="w-5 h-5 text-indigo-400" /> 学習タイマー
          </div>
          {isTimerOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {isTimerOpen && (
          <div className="p-6 flex flex-col items-center bg-[#111111]/50">
            <div className="text-4xl font-black tracking-widest text-indigo-400 mb-6 drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              00:00:00
            </div>
            <div className="flex gap-4">
              <button className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center hover:bg-indigo-500 transition-colors">
                <Play className="w-5 h-5 ml-1" />
              </button>
              <button className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors text-slate-400">
                <Pause className="w-5 h-5" />
              </button>
              <button className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center hover:bg-rose-500/30 transition-colors">
                <Square className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 📝 過去のメモリスト */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Notes</span>
          <button className="p-1 hover:bg-white/10 rounded-md transition-colors text-indigo-400">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {DUMMY_NOTES.map((note) => (
          <button 
            key={note.id}
            onClick={() => onNoteClick(note.page)} // 🌟 クリックで親にページ番号を伝える
            className="w-full text-left p-4 rounded-2xl bg-[#2c2c2e] hover:bg-[#38383a] border border-[#38383a] hover:border-indigo-500/50 transition-all group"
          >
            <div className="flex justify-between text-[10px] font-black mb-2 text-slate-400">
              <span className="text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">P.{note.page}</span>
              <span>{note.date}</span>
            </div>
            <p className="text-xs font-bold leading-relaxed text-slate-200 line-clamp-2">
              {note.content}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}