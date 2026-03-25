'use client';

import { Dispatch, SetStateAction } from 'react'; 
import { Timer, Play, Pause, Plus, X, Send } from 'lucide-react';

type PdfSidebarProps = {
  seconds: number;
  isRunning: boolean;
  setIsRunning: Dispatch<SetStateAction<boolean>>;
  // 🌟 メモ機能に必要なPropsを復活
  notes: any[];
  isAddingNote: boolean;
  setIsAddingNote: Dispatch<SetStateAction<boolean>>;
  notePage: number;
  setNotePage: Dispatch<SetStateAction<number>>;
  noteContent: string;
  setNoteContent: Dispatch<SetStateAction<string>>;
  handleSaveNote: () => void;
  onNoteClick: (pageNumber: number) => void;
};

export default function PdfSidebar({ 
  seconds, isRunning, setIsRunning,
  notes, isAddingNote, setIsAddingNote, notePage, setNotePage, noteContent, setNoteContent, handleSaveNote, onNoteClick
}: PdfSidebarProps) {
  
  const formatTime = (totalSeconds: number) => {
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <aside className="w-full h-full flex flex-col relative z-10 overflow-y-auto no-scrollbar">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-500/20 rounded-lg"><Timer className="w-4 h-4 text-indigo-400" /></div>
          <h2 className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">Study Timer</h2>
        </div>
        
        <div className="bg-white/5 rounded-3xl p-6 border border-white/5 text-center shadow-inner mb-8">
          <div className="text-4xl font-black text-white mb-6 tracking-tighter tabular-nums">
            {formatTime(seconds)}
          </div>
          <button 
            onClick={() => setIsRunning(!isRunning)} 
            className={`w-full py-4 rounded-xl font-bold transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 ${isRunning ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-600 text-white'}`}
          >
            {isRunning ? <><Pause size={18} fill="currentColor"/> PAUSE</> : <><Play size={18} fill="currentColor"/> RESUME</>}
          </button>
        </div>

        {/* 🌟 メモ機能 */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] text-indigo-400 font-black tracking-[0.2em] uppercase">Notes</span>
          <button onClick={() => setIsAddingNote(true)} className="p-1 hover:bg-white/10 rounded-md transition-colors text-indigo-400">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {isAddingNote && (
          <div className="bg-[#2c2c2e] p-4 rounded-xl border border-indigo-500/50 mb-4 shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <input type="number" value={notePage} onChange={(e) => setNotePage(Number(e.target.value))} className="w-16 bg-black/30 border border-white/10 rounded px-2 py-1 text-xs font-black text-indigo-400 outline-none" placeholder="Page" />
              <button onClick={() => setIsAddingNote(false)}><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <textarea autoFocus value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="メモを入力..." className="w-full bg-transparent text-sm font-bold text-white outline-none resize-none h-20 placeholder:text-slate-600 mb-2" />
            <button onClick={handleSaveNote} className="w-full py-2 bg-indigo-600 rounded-lg text-xs font-black flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all text-white">
              <Send className="w-3 h-3" /> 保存
            </button>
          </div>
        )}

        <div className="space-y-2">
          {notes.map((note) => (
            <button key={note.id} onClick={() => onNoteClick(note.page_number)} className="w-full text-left p-4 rounded-xl bg-black/20 hover:bg-black/40 border border-white/5 hover:border-indigo-500/30 transition-all group">
              <div className="flex justify-between text-[10px] font-black mb-2 text-slate-500">
                <span className="text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">P.{note.page_number}</span>
                <span>{new Date(note.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-xs font-bold leading-relaxed text-slate-300 line-clamp-3">{note.content}</p>
            </button>
          ))}
          {notes.length === 0 && !isAddingNote && <p className="text-xs font-bold text-slate-600 text-center py-4">メモはありません</p>}
        </div>
      </div>
    </aside>
  );
}