'use client';

import { Dispatch, SetStateAction, useState, useRef, useEffect } from 'react';
import { Timer, Play, Pause, Plus, X, Send, Trash2, Edit2, FileText, ChevronDown, RotateCcw, Save, Loader2, PencilLine, Check } from 'lucide-react';

type PdfSidebarProps = {
  seconds: number;
  isRunning: boolean;
  setIsRunning: Dispatch<SetStateAction<boolean>>;
  notes: any[];
  isAddingNote: boolean;
  setIsAddingNote: Dispatch<SetStateAction<boolean>>;
  notePage: number;
  setNotePage: Dispatch<SetStateAction<number>>;
  noteContent: string;
  setNoteContent: Dispatch<SetStateAction<string>>;
  handleSaveNote: () => void;
  handleDeleteNote: (id: string) => void;
  onNoteClick: (pageNumber: number) => void;
  handleEditNote: (note: any) => void;
  handleCancelNote: () => void;
  editingNoteId: string | null;
  pdfList: string[];
  currentIndex: number;
  setCurrentIndex: Dispatch<SetStateAction<number>>;
  memo: string;
  setMemo: Dispatch<SetStateAction<string>>;
  handleSave: () => void;
  isSaving: boolean;
  setSeconds: Dispatch<SetStateAction<number>>;
  fileNames?: (string | undefined)[];
  materialTitle?: string;
  onRenameTitle?: (newTitle: string) => Promise<void>;
};

export default function PdfSidebar({
  seconds, isRunning, setIsRunning,
  notes, isAddingNote, setIsAddingNote, notePage, setNotePage, noteContent, setNoteContent,
  handleSaveNote, handleDeleteNote, onNoteClick, handleEditNote, handleCancelNote, editingNoteId,
  pdfList, currentIndex, setCurrentIndex,
  memo, setMemo, handleSave, isSaving, setSeconds,
  fileNames, materialTitle, onRenameTitle,
}: PdfSidebarProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(materialTitle ?? '');
  const [renaming, setRenaming] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) renameInputRef.current?.select();
  }, [isRenaming]);

  const submitRename = async () => {
    if (!renameValue.trim() || !onRenameTitle) { setIsRenaming(false); return; }
    setRenaming(true);
    await onRenameTitle(renameValue.trim());
    setRenaming(false);
    setIsRenaming(false);
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <aside className="w-full h-full flex flex-col relative z-10 overflow-y-auto no-scrollbar pb-10">
      <div className="p-6">
        
        {/* 教材名 + リネーム */}
        {materialTitle !== undefined && (
          <div className="mb-5">
            {isRenaming ? (
              <div className="flex items-center gap-2">
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setIsRenaming(false); }}
                  className="flex-1 bg-black/40 border border-indigo-500 rounded-lg px-3 py-1.5 text-xs font-bold text-white outline-none"
                />
                <button onClick={submitRename} disabled={renaming} className="p-1.5 bg-indigo-600 rounded-lg text-white disabled:opacity-50">
                  {renaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setIsRenaming(false)} className="p-1.5 bg-white/10 rounded-lg text-white/50">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setRenameValue(materialTitle); setIsRenaming(true); }}
                className="group flex items-center gap-2 w-full text-left"
              >
                <span className="text-xs font-black text-white/60 truncate flex-1">{materialTitle}</span>
                <Edit2 className="w-3 h-3 text-white/20 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
              </button>
            )}
          </div>
        )}

        {/* タイマー機能 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-500/20 rounded-lg"><Timer className="w-4 h-4 text-indigo-400" /></div>
          <h2 className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">Study Timer</h2>
        </div>
        
        <div className="bg-white/5 rounded-3xl p-6 border border-white/5 text-center shadow-inner mb-6">
          <div className="text-4xl font-black text-white mb-6 tracking-tighter tabular-nums">
            {formatTime(seconds)}
          </div>
          
          <div className="flex gap-2">
            {!isRunning && seconds > 0 && (
              <button 
                onClick={() => { setIsRunning(false); setSeconds(0); setMemo(""); }}
                className="flex-1 py-3 bg-white/10 text-white/70 rounded-xl font-bold hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center"
                aria-label="タイマーをリセット"
                title="タイマーをリセット"
              >
                <RotateCcw size={16} />
              </button>
            )}
            <button 
              onClick={() => setIsRunning(!isRunning)} 
              className={`flex-[3] py-3 rounded-xl font-bold transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 ${isRunning ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-indigo-600 text-white'}`}
            >
              {isRunning ? <><Pause size={16} fill="currentColor"/> PAUSE</> : <><Play size={16} fill="currentColor"/> {seconds > 0 ? 'RESUME' : 'START'}</>}
            </button>
          </div>

          <div className={`transition-all duration-500 overflow-hidden text-left ${!isRunning && seconds > 0 ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div>
                <label className="flex items-center gap-1 text-[10px] font-black text-white/40 mb-2 uppercase tracking-widest">
                  <PencilLine className="w-3 h-3" /> メモ・感想 (任意)
                </label>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="今日の学びや反省を記録..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all resize-none h-20 placeholder:text-white/20"
                />
              </div>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? "保存中..." : "記録を保存して終了"}
              </button>
            </div>
          </div>
        </div>

        {pdfList && pdfList.length > 1 && (
          <div className="mb-8">
            <label className="flex items-center gap-2 text-[10px] text-indigo-400 font-black tracking-[0.2em] uppercase mb-2 ml-1">
              <FileText className="w-3.5 h-3.5" /> Document Select
            </label>
            <div className="relative group">
              {/* 🌟 修正箇所: selectタグに aria-label と title を追加 */}
              <select 
                value={currentIndex}
                onChange={(e) => setCurrentIndex(Number(e.target.value))}
                className="w-full bg-[#1c1c1e] hover:bg-[#252528] border border-white/10 rounded-2xl px-4 py-3.5 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer appearance-none shadow-lg pr-10"
                aria-label="表示するPDFドキュメントを選択" 
                title="表示するPDFドキュメントを選択"
              >
                {pdfList.map((pdf, idx) => {
                  const name = fileNames?.[idx] ?? pdf.split('/').pop()?.replace(/^\d+_/, '') ?? `Document ${idx + 1}`;
                  return <option key={idx} value={idx}>{name}</option>;
                })}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors pointer-events-none" />
            </div>
          </div>
        )}

        {/* メモ機能 */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] text-indigo-400 font-black tracking-[0.2em] uppercase">Notes</span>
          <button 
            onClick={() => { setIsAddingNote(true); setNoteContent(""); }} 
            className="p-1 hover:bg-white/10 rounded-md transition-colors text-indigo-400"
            aria-label="新規メモを追加"
            title="新規メモを追加"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {isAddingNote && (
          <div className="bg-[#2c2c2e] p-4 rounded-xl border border-indigo-500/50 mb-4 shadow-lg animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-indigo-400/70 font-black uppercase">{editingNoteId ? "メモを編集" : "新規メモ"}</span>
                <input type="number" value={notePage} onChange={(e) => setNotePage(Number(e.target.value))} className="w-16 bg-black/30 border border-white/10 rounded px-2 py-1 text-xs font-black text-indigo-400 outline-none" placeholder="Page" />
              </div>
              <button 
                onClick={editingNoteId ? handleCancelNote : () => setIsAddingNote(false)}
                aria-label="閉じる"
                title="閉じる"
              >
                <X className="w-4 h-4 text-slate-500 hover:text-white transition-colors" />
              </button>
            </div>
            <textarea autoFocus value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="メモを入力..." className="w-full bg-transparent text-sm font-bold text-white outline-none resize-none h-20 placeholder:text-slate-600 mb-2" />
            <button onClick={handleSaveNote} className="w-full py-2 bg-indigo-600 rounded-lg text-xs font-black flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all text-white">
              <Send className="w-3 h-3" /> 保存
            </button>
          </div>
        )}

        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="relative w-full group animate-in fade-in duration-300">
              <button 
                onClick={() => onNoteClick(note.page_number)} 
                className="w-full text-left p-4 rounded-xl bg-black/20 hover:bg-black/40 border border-white/5 hover:border-indigo-500/30 active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex justify-between text-[10px] font-black mb-2 text-slate-500 pr-12">
                  <span className="text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">P.{note.page_number}</span>
                  <span>{new Date(note.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-xs font-bold leading-relaxed text-slate-300 line-clamp-3">{note.content}</p>
              </button>

              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleEditNote(note); }}
                  className="p-1.5 bg-black/60 text-indigo-400 hover:text-white hover:bg-indigo-500 rounded-md transition-all"
                  aria-label="メモを編集"
                  title="メモを編集"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                  className="p-1.5 bg-black/60 text-rose-500 hover:text-white hover:bg-rose-500 rounded-md transition-all"
                  aria-label="メモを削除"
                  title="メモを削除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {notes.length === 0 && !isAddingNote && <p className="text-xs font-bold text-slate-600 text-center py-4">メモはありません</p>}
        </div>
      </div>
    </aside>
  );
}