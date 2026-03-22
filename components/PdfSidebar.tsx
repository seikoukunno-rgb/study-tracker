'use client';

import { Dispatch, SetStateAction, useState, useRef, useEffect } from 'react'; 
import { Timer, PenTool, Highlighter, Eraser, Type } from 'lucide-react';

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

  // 🌟 位置とドラッグ状態の管理
  const [pos, setPos] = useState({ x: 0, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  
  const dragStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. 画面に触れた瞬間に「長押しタイマー(400ms)」をスタート
  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    dragStart.current = { x: clientX, y: clientY, initialX: pos.x, initialY: pos.y };

    timerRef.current = setTimeout(() => {
      setIsDragging(true);
      // スマホなら「ブルッ」と振動させて長押し完了を知らせる（対応機種のみ）
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50); 
      }
    }, 400); 
  };

  // 2. 指を離した、またはタイマー発動前に大きく動かしたらキャンセル（ただのタップやスクロールと判定）
  const cancelTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleMoveEarly = (e: React.MouseEvent | React.TouchEvent) => {
    if (isDragging) return; 
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const dx = Math.abs(clientX - dragStart.current.x);
    const dy = Math.abs(clientY - dragStart.current.y);
    // 10px以上指がズレたら、長押しをキャンセルする
    if (dx > 10 || dy > 10) cancelTimer();
  };

  // 3. 実際にドラッグして移動させる処理（長押しが完了して isDragging が true の時だけ発動）
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      if (e.cancelable) e.preventDefault(); // 移動中のスクロールを完全にブロック

      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      
      setPos({
        x: dragStart.current.initialX + (clientX - dragStart.current.x),
        y: dragStart.current.initialY + (clientY - dragStart.current.y)
      });
    };

    const handleEnd = () => {
      cancelTimer();
      setIsDragging(false);
    };

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
        onMouseDown={handleStart} onTouchStart={handleStart}
        onMouseMove={handleMoveEarly} onTouchMove={handleMoveEarly}
        onMouseUp={cancelTimer} onTouchEnd={cancelTimer} onMouseLeave={cancelTimer}
        style={{ 
          // 移動と、長押し成功時のフワッと拡大するアニメーション
          transform: `translate(calc(-50% + ${pos.x}px), ${pos.y}px) scale(${isDragging ? 1.05 : 1})`,
          touchAction: 'none' 
        }}
        // 長押し中はカーソルが変わり、影が濃くなって「掴んでいる感」を出す
        className={`fixed left-1/2 z-[100] bg-black/90 backdrop-blur-xl px-3 py-2 rounded-2xl flex items-center gap-3 border border-white/10 select-none transition-shadow ${
          isDragging ? 'shadow-[0_20px_50px_rgba(0,0,0,0.8)] ring-2 ring-indigo-500/50 cursor-grabbing' : 'shadow-[0_10px_30px_rgba(0,0,0,0.5)] cursor-grab'
        }`}
      >
        {/* 🌟 長押しして掴んでいる最中は、誤ってボタンを押さないように pointer-events-none でガードする */}
        <div className={`flex items-center gap-1 ${isDragging ? 'pointer-events-none' : ''}`}>
          <button onClick={() => setDrawingMode('pen')} className={`p-2 rounded-xl transition-all ${drawingMode === 'pen' ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'text-white/40 hover:bg-white/10'}`}><PenTool className="w-5 h-5" /></button>
          <button onClick={() => setDrawingMode('marker')} className={`p-2 rounded-xl transition-all ${drawingMode === 'marker' ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'text-white/40 hover:bg-white/10'}`}><Highlighter className="w-5 h-5" /></button>
          <button onClick={() => setDrawingMode('eraser')} className={`p-2 rounded-xl transition-all ${drawingMode === 'eraser' ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'text-white/40 hover:bg-white/10'}`}><Eraser className="w-5 h-5" /></button>
          <button onClick={() => setDrawingMode('text')} className={`p-2 rounded-xl transition-all ${drawingMode === 'text' ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'text-white/40 hover:bg-white/10'}`}><Type className="w-5 h-5" /></button>
          
          <div className="w-[1px] h-6 bg-white/10 mx-2" />

          {/* 色選択 */}
          <div className="flex gap-2 mr-1">
            {['#ef4444', '#3b82f6', '#eab308'].map((c) => (
              <button key={c} onClick={() => setDrawingColor(c)} className={`w-6 h-6 rounded-full border-2 transition-transform ${drawingColor === c ? 'border-white scale-125' : 'border-transparent'}`} style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </div>

      {/* 右側の本来のサイドバー（PC用） */}
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