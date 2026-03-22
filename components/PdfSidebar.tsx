// components/PdfSidebar.tsx
'use client';

import { Dispatch, SetStateAction } from 'react';
// 🌟 Type を忘れずにインポート！
import { Timer, PenTool, Highlighter, Eraser, Type, ChevronLeft } from 'lucide-react';

type PdfSidebarProps = {
  onNoteClick: (pageNumber: number) => void;
  drawingMode: 'none' | 'pen' | 'marker' | 'eraser' | 'text';
  setDrawingMode: Dispatch<SetStateAction<'none' | 'pen' | 'marker' | 'eraser' | 'text'>>;
  drawingColor: string;
  setDrawingColor: Dispatch<SetStateAction<string>>;
  penWidth: number;
  setPenWidth: Dispatch<SetStateAction<number>>;
  markerWidth: number;
  setMarkerWidth: Dispatch<SetStateAction<number>>;
};

export default function PdfSidebar({ 
  onNoteClick, drawingMode, setDrawingMode,
  drawingColor, setDrawingColor,
  penWidth, setPenWidth, markerWidth, setMarkerWidth 
}: PdfSidebarProps) {

  // 🌟 ボタン共通パーツ
  const ToolButtons = () => (
    <>
      <button onClick={() => setDrawingMode('pen')} className={`p-2 rounded-lg ${drawingMode === 'pen' ? 'bg-indigo-600' : 'text-white/60'}`}><PenTool className="w-5 h-5" /></button>
      <button onClick={() => setDrawingMode('marker')} className={`p-2 rounded-lg ${drawingMode === 'marker' ? 'bg-indigo-600' : 'text-white/60'}`}><Highlighter className="w-5 h-5" /></button>
      <button onClick={() => setDrawingMode('eraser')} className={`p-2 rounded-lg ${drawingMode === 'eraser' ? 'bg-indigo-600' : 'text-white/60'}`}><Eraser className="w-5 h-5" /></button>
      {/* 🌟 Tボタンを追加 */}
      <button onClick={() => setDrawingMode('text')} className={`p-2 rounded-lg ${drawingMode === 'text' ? 'bg-indigo-600' : 'text-white/60'}`}><Type className="w-5 h-5" /></button>
    </>
  );

  return (
    <aside className="w-80 h-full bg-[#1c1c1e] border-l border-[#2c2c2e] flex flex-col relative">
      
      {/* 1. 🌟 デスクトップ用ツールバー (画面が広い時) */}
      <div className="hidden md:flex absolute top-4 left-[-260px] z-50 bg-black/80 backdrop-blur-md px-4 py-2 rounded-2xl items-center gap-3 border border-white/10 shadow-2xl">
        <ToolButtons />
        <div className="w-[1px] h-6 bg-white/20 mx-1" />
        {/* 色選択 */}
        <div className="flex gap-1">
          {['#ef4444', '#3b82f6', '#eab308'].map((c) => (
            <button key={c} onClick={() => setDrawingColor(c)} className={`w-5 h-5 rounded-full border-2 ${drawingColor === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      {/* 2. 🌟 スマホ用ツールバー (画面が狭い時：画像にあった黒いバー) */}
      <div className="md:hidden fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-black/80 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-3 border border-white/10 shadow-2xl w-[90%] justify-between">
        <div className="flex gap-2">
          <ToolButtons />
        </div>
        <div className="flex gap-2">
          {['#ef4444', '#3b82f6', '#eab308'].map((c) => (
            <button key={c} onClick={() => setDrawingColor(c)} className={`w-5 h-5 rounded-full ${drawingColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`} style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      {/* 右側のコントロールパネル（タイマーやメモ）のコードがここに入る */}
      <div className="p-6">
        <h2 className="text-xs font-black tracking-widest text-slate-500 mb-8 uppercase">Control Panel</h2>
        {/* ここにタイマーやメモの続きを書いてください */}
      </div>

    </aside>
  );
}