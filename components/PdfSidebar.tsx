'use client';

import { Dispatch, SetStateAction, useState, useRef, useEffect } from 'react'; 
import { Timer, PenTool, Highlighter, Eraser, Type, GripVertical, X, Send, Plus } from 'lucide-react';

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
  eraserWidth: number;
  setEraserWidth: Dispatch<SetStateAction<number>>;
};

export default function PdfSidebar({ 
  onNoteClick, drawingMode, setDrawingMode,
  drawingColor, setDrawingColor,
  penWidth, setPenWidth, markerWidth, setMarkerWidth,
  eraserWidth, setEraserWidth
}: PdfSidebarProps) {

  // 🌟 位置管理（初期位置は画面中央上部）
  const [pos, setPos] = useState({ x: 0, y: 30 });
  const [isDragging, setIsDragging] = useState(false);
  
  const dragStart = useRef({ mouseX: 0, mouseY: 0, initialX: 0, initialY: 0 });

  // 1. ドラッグ開始（ハンドルを掴んだとき）
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    dragStart.current = { 
      mouseX: clientX, 
      mouseY: clientY, 
      initialX: pos.x, 
      initialY: pos.y 
    };

    // スマホなら少しだけ振動させる（心地よい操作感）
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(10); 
    }
  };

  // 2. 移動と終了の処理
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      if (e.cancelable) e.preventDefault(); 

      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      
      setPos({
        x: dragStart.current.initialX + (clientX - dragStart.current.mouseX),
        y: dragStart.current.initialY + (clientY - dragStart.current.mouseY)
      });
    };

    const handleEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMove, { passive: false });
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

  return (
    <>
      {/* 🌟 自由に動くフローティングツールバー */}
      <div 
        style={{ 
          transform: `translate(calc(-50% + ${pos.x}px), ${pos.y}px)`,
          touchAction: 'none' 
        }}
        className={`fixed top-0 left-1/2 z-[100] bg-[#1c1c1e]/90 backdrop-blur-xl pl-1 pr-3 py-1.5 rounded-2xl flex items-center gap-1 border border-white/10 select-none shadow-2xl transition-shadow ${
          isDragging ? 'ring-2 ring-indigo-500/50 shadow-indigo-500/20' : ''
        }`}
      >
        {/* 🌟 移動用ハンドル：ここを掴むと自由に動かせる */}
        <div 
          onMouseDown={handleDragStart} 
          onTouchStart={handleDragStart}
          className="p-2 cursor-grab active:cursor-grabbing text-white/20 hover:text-white/60 transition-colors"
        >
          <GripVertical className="w-5 h-5" />
        </div>

        <div className={`flex items-center gap-1 ${isDragging ? 'pointer-events-none' : ''}`}>
          <button onClick={() => setDrawingMode(drawingMode === 'pen' ? 'none' : 'pen')} className={`p-2 rounded-xl transition-all ${drawingMode === 'pen' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/10'}`}><PenTool className="w-4 h-4" /></button>
          <button onClick={() => setDrawingMode(drawingMode === 'marker' ? 'none' : 'marker')} className={`p-2 rounded-xl transition-all ${drawingMode === 'marker' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/10'}`}><Highlighter className="w-4 h-4" /></button>
          <button onClick={() => setDrawingMode(drawingMode === 'eraser' ? 'none' : 'eraser')} className={`p-2 rounded-xl transition-all ${drawingMode === 'eraser' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/10'}`}><Eraser className="w-4 h-4" /></button>
          <button onClick={() => setDrawingMode(drawingMode === 'text' ? 'none' : 'text')} className={`p-2 rounded-xl transition-all ${drawingMode === 'text' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/10'}`}><Type className="w-4 h-4" /></button>
          
          <div className="w-[1px] h-5 bg-white/10 mx-1" />

          {/* 色選択 */}
          <div className="flex gap-1.5">
            {['#ef4444', '#3b82f6', '#eab308'].map((c) => (
              <button key={c} onClick={() => setDrawingColor(c)} className={`w-5 h-5 rounded-full border-2 transition-transform ${drawingColor === c ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`} style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </div>

      {/* 右側のPC用サイドバー */}
      <aside className="hidden lg:flex w-80 h-full bg-[#0d0d0f] border-l border-white/5 flex-col relative z-10">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-indigo-500/20 rounded-lg"><Timer className="w-4 h-4 text-indigo-400" /></div>
            <h2 className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">Control Panel</h2>
          </div>
          <div className="bg-white/5 rounded-3xl p-8 border border-white/5 text-center">
            <div className="text-5xl font-black text-white mb-8 tracking-tighter">00:00</div>
            <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold">RESUME</button>
          </div>
        </div>
      </aside>
    </>
  );
}