// components/PdfSidebar.tsx
'use client';

import { Dispatch, SetStateAction } from 'react';
// 🌟 Type (テキストアイコン) を追加
import { Timer, PenTool, Highlighter, Eraser, Type } from 'lucide-react';

// 1. 🌟 Props の型定義を最新版にアップデート
type PdfSidebarProps = {
  onNoteClick: (pageNumber: number) => void;
  // 'text' モードを追加
  drawingMode: 'none' | 'pen' | 'marker' | 'eraser' | 'text';
  setDrawingMode: Dispatch<SetStateAction<'none' | 'pen' | 'marker' | 'eraser' | 'text'>>;
  drawingColor: string;
  setDrawingColor: Dispatch<SetStateAction<string>>;
  // 太さ調整用の Props を追加
  penWidth: number;
  setPenWidth: Dispatch<SetStateAction<number>>;
  markerWidth: number;
  setMarkerWidth: Dispatch<SetStateAction<number>>;
};

// 2. 🌟 コンポーネントの引数をアップデート
export default function PdfSidebar({ 
  onNoteClick, 
  drawingMode, 
  setDrawingMode,
  drawingColor,
  setDrawingColor,
  penWidth,
  setPenWidth,
  markerWidth,
  setMarkerWidth
}: PdfSidebarProps) {

  return (
    <aside className="w-80 h-full bg-[#1c1c1e] border-l border-[#2c2c2e] flex flex-col relative">
      
      {/* 🌟 黒い浮いているツールバー（ここを修正！） */}
      <div className="absolute top-4 left-[-260px] z-50 bg-black/80 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-3 border border-white/10 shadow-2xl">
        
        {/* ペン */}
        <button 
          onClick={() => setDrawingMode('pen')}
          className={`p-2 rounded-lg ${drawingMode === 'pen' ? 'bg-indigo-600' : 'text-white/60 hover:bg-white/10'}`}
        >
          <PenTool className="w-5 h-5" />
        </button>

        {/* マーカー */}
        <button 
          onClick={() => setDrawingMode('marker')}
          className={`p-2 rounded-lg ${drawingMode === 'marker' ? 'bg-indigo-600' : 'text-white/60 hover:bg-white/10'}`}
        >
          <Highlighter className="w-5 h-5" />
        </button>

        {/* 消しゴム */}
        <button 
          onClick={() => setDrawingMode('eraser')}
          className={`p-2 rounded-lg ${drawingMode === 'eraser' ? 'bg-indigo-600' : 'text-white/60 hover:bg-white/10'}`}
        >
          <Eraser className="w-5 h-5" />
        </button>

        {/* 🌟 テキスト追加ボタン（ついに合流！） */}
        <button 
          onClick={() => setDrawingMode('text')}
          className={`p-2 rounded-lg ${drawingMode === 'text' ? 'bg-indigo-600' : 'text-white/60 hover:bg-white/10'}`}
          title="テキスト入力"
        >
          <Type className="w-5 h-5" />
        </button>

        <div className="w-[1px] h-6 bg-white/20 mx-1" />

        {/* 🌟 太さ調整スライダー（ペンかマーカーの時だけ出す） */}
        {(drawingMode === 'pen' || drawingMode === 'marker') && (
          <div className="flex items-center gap-2 px-2 animate-in fade-in slide-in-from-left-2">
            <span className="text-[10px] font-black text-white/40 uppercase">Size</span>
            <input 
              type="range" 
              // ペンは1〜10、マーカーは10〜50
              min={drawingMode === 'pen' ? "1" : "10"} 
              max={drawingMode === 'pen' ? "10" : "50"} 
              value={drawingMode === 'pen' ? penWidth : markerWidth}
              onChange={(e) => {
                const val = Number(e.target.value);
                drawingMode === 'pen' ? setPenWidth(val) : setMarkerWidth(val);
              }}
              className="w-16 accent-indigo-500 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        )}

        {/* 色選択（赤・青・黄のボタン） */}
        <div className="flex gap-1">
          {['#ef4444', '#3b82f6', '#eab308'].map((c) => (
            <button 
              key={c}
              onClick={() => setDrawingColor(c)}
              className={`w-5 h-5 rounded-full border-2 ${drawingColor === c ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* ...残りのタイマーやメモのコード（修正不要）... */}
    </aside>
  );
}