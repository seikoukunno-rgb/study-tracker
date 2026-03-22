'use client';

import { Dispatch, SetStateAction, useState, useRef, useEffect } from 'react'; 
import { Timer, PenTool, Highlighter, Eraser, Type, GripVertical, Play, Pause, X } from 'lucide-react';

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
  seconds?: number;
  isRunning?: boolean;
  setIsRunning?: Dispatch<SetStateAction<boolean>>;
};

export default function PdfSidebar({ 
  drawingMode, setDrawingMode,
  drawingColor, setDrawingColor,
  seconds, isRunning, setIsRunning
}: PdfSidebarProps) {

  const [pos, setPos] = useState({ x: 0, y: 30 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, initialX: 0, initialY: 0 });

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStart.current = { mouseX: clientX, mouseY: clientY, initialX: pos.x, initialY: pos.y };
  };

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
      <div 
        style={{ transform: `translate(calc(-50% + ${pos.x}px), ${pos.y}px)`, touchAction: 'none' }}
        className={`fixed top-0 left-1/2 z-[100] bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-2xl ${
          drawingMode === 'none' ? 'px-1 py-1 gap-0' : 'px-3 py-2 gap-2'
        }`}
      >
        {/* 移動用ハンドル */}
        <div onMouseDown={handleDragStart} onTouchStart={handleDragStart} className="p-2 cursor-grab active:cursor-grabbing text-white/20 hover:text-white/60">
          <GripVertical className="w-5 h-5" />
        </div>

        {/* 🌟 収納時（drawingMode === 'none'）: ペン開始ボタンと時間だけ表示 */}
        {drawingMode === 'none' ? (
          <button 
            onClick={() => setDrawingMode('pen')}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 rounded-xl transition-all group"
          >
            <PenTool className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            {seconds !== undefined && (
              <span className="text-white/80 font-black font-mono text-sm tracking-widest border-l border-white/10 pl-3">
                {formatTime(seconds)}
              </span>
            )}
          </button>
        ) : (
          /* 🌟 展開時（お絵描き中）: すべてのコントロールを表示 */
          <div className={`flex items-center gap-1 animate-in fade-in slide-in-from-left-2 duration-300 ${isDragging ? 'pointer-events-none' : ''}`}>
            {seconds !== undefined && isRunning !== undefined && setIsRunning && (
              <button onClick={() => setIsRunning(!isRunning)} className="flex items-center gap-2 px-2 hover:opacity-80 transition-opacity pr-3 border-r border-white/10 mr-1">
                {isRunning ? <Play className="w-4 h-4 text-indigo-400 fill-current animate-pulse" /> : <Pause className="w-4 h-4 text-amber-400 fill-current" />}
                <span className="text-white font-black font-mono text-lg tracking-wider">
                  {formatTime(seconds)}
                </span>
              </button>
            )}

            <button onClick={() => setDrawingMode('pen')} className={`p-2 rounded-xl transition-all ${drawingMode === 'pen' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/10'}`}><PenTool className="w-4 h-4" /></button>
            <button onClick={() => setDrawingMode('marker')} className={`p-2 rounded-xl transition-all ${drawingMode === 'marker' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/10'}`}><Highlighter className="w-4 h-4" /></button>
            <button onClick={() => setDrawingMode('eraser')} className={`p-2 rounded-xl transition-all ${drawingMode === 'eraser' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/10'}`}><Eraser className="w-4 h-4" /></button>
            <button onClick={() => setDrawingMode('text')} className={`p-2 rounded-xl transition-all ${drawingMode === 'text' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/10'}`}><Type className="w-4 h-4" /></button>
            
            <div className="w-[1px] h-5 bg-white/10 mx-1" />

            <div className="flex gap-1.5 mr-2">
              {['#ef4444', '#3b82f6', '#eab308'].map((c) => (
                <button key={c} onClick={() => setDrawingColor(c)} className={`w-5 h-5 rounded-full border-2 transition-transform ${drawingColor === c ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`} style={{ backgroundColor: c }} />
              ))}
            </div>

            {/* 🌟 閉じるボタン（収納する） */}
            <button 
              onClick={() => setDrawingMode('none')}
              className="p-1.5 hover:bg-white/10 rounded-full text-white/30 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <aside className="hidden lg:flex w-80 h-full bg-[#0d0d0f] border-l border-white/5 flex-col relative z-10">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-indigo-500/20 rounded-lg"><Timer className="w-4 h-4 text-indigo-400" /></div>
            <h2 className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">Control Panel</h2>
          </div>
          {seconds !== undefined && isRunning !== undefined && setIsRunning && (
            <div className="bg-white/5 rounded-3xl p-8 border border-white/5 text-center shadow-inner">
              <span className="text-[10px] font-bold text-indigo-400/80 tracking-widest uppercase mb-2 block">Study Session</span>
              <div className="text-5xl font-black text-white mb-8 tracking-tighter tabular-nums">{formatTime(seconds)}</div>
              <button onClick={() => setIsRunning(!isRunning)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all shadow-xl active:scale-95">{isRunning ? 'PAUSE' : 'RESUME'}</button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}