// components/PdfSidebar.tsx
'use client';

import { Dispatch, SetStateAction, useState, useRef, useEffect } from 'react'; 
import { Timer, PenTool, Highlighter, Eraser, Type, GripVertical, CheckCircle2 } from 'lucide-react';

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

  // 🌟 ツールバーの位置管理（初期位置は画面中央上部）
  const [pos, setPos] = useState({ x: 0, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });

  // 🌟 ドラッグ開始（ハンドルを掴んだ時だけ反応）
  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    // ボタンのクリックとドラッグを完全に分離するため、ハンドル(drag-handle)のみ許可
    if (!(e.target as HTMLElement).closest('.drag-handle')) return;

    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    dragStart.current = { x: clientX, y: clientY, initialX: pos.x, initialY: pos.y };
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      
      setPos({
        x: dragStart.current.initialX + (clientX - dragStart.current.x),
        y: dragStart.current.initialY + (clientY - dragStart.current.y)
      });
    };

    const handleEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  const ToolButtons = () => (
    <div className="flex items-center gap-1">
      <button onClick={() => setDrawingMode('pen')} className={`p-2 rounded-xl transition-all ${drawingMode === 'pen' ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'text-white/40 hover:bg-white/10'}`}><PenTool className="w-5 h-5" /></button>
      <button onClick={() => setDrawingMode('marker')} className={`p-2 rounded-xl transition-all ${drawingMode === 'marker' ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'text-white/40 hover:bg-white/10'}`}><Highlighter className="w-5 h-5" /></button>
      <button onClick={() => setDrawingMode('eraser')} className={`p-2 rounded-xl transition-all ${drawingMode === 'eraser' ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'text-white/40 hover:bg-white/10'}`}><Eraser className="w-5 h-5" /></button>
      <button onClick={() => setDrawingMode('text')} className={`p-2 rounded-xl transition-all ${drawingMode === 'text' ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'text-white/40 hover:bg-white/10'}`}><Type className="w-5 h-5" /></button>
    </div>
  );

  return (
    <>
      {/* 🌟 自由に動くフローティングツールバー（デスクトップ・スマホ共通） */}
      <div 
        onMouseDown={handleStart} onTouchStart={handleStart}
        style={{ transform: `translate(calc(-50% + ${pos.x}px), ${pos.y}px)` }}
        className="fixed left-1/2 z-[100] bg-black/90 backdrop-blur-xl px-3 py-2 rounded-2xl flex items-center gap-3 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] touch-none"
      >
        {/* 🌟 ドラッグハンドル：ここを掴んで自由に移動！ */}
        <div className="drag-handle cursor-grab active:cursor-grabbing p-1 text-white/20 hover:text-white/60 transition-colors">
          <GripVertical className="w-5 h-5" />
        </div>

        <ToolButtons />

        <div className="w-[px] h-6 bg-white/10 mx-1" />

        {/* 色選択 */}
        <div className="flex gap-2 mr-2">
          {['#ef4444', '#3b82f6', '#eab308'].map((c) => (
            <button key={c} onClick={() => setDrawingColor(c)} className={`w-6 h-6 rounded-full border-2 transition-transform ${drawingColor === c ? 'border-white scale-125' : 'border-transparent'}`} style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      {/* 右側の本来のサイドバー（タイマーやメモ） */}
      <aside className="hidden lg:flex w-80 h-full bg-[#1c1c1e] border-l border-[#2c2c2e] flex-col relative z-10">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-indigo-500/20 rounded-lg"><Timer className="w-4 h-4 text-indigo-400" /></div>
            <h2 className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">Control Panel</h2>
          </div>
          
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-3xl p-8 border border-white/5 text-center shadow-inner">
            <span className="text-[10px] font-bold text-indigo-400/80 tracking-widest uppercase mb-2 block">Study Session</span>
            <div className="text-5xl font-black text-white mb-8 tracking-tighter tabular-nums">00:00</div>
            <button className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all shadow-xl active:scale-95">RESUME</button>
          </div>
        </div>
      </aside>
    </>
  );
}