'use client';

import { PenTool, Highlighter, Eraser, Type, MousePointer2, ChevronDown, Menu, Play, Pause, Trash2, Check } from 'lucide-react';
import { Dispatch, SetStateAction, useState, useRef, useEffect } from 'react';

type PdfToolbarProps = {
  mode: 'none' | 'pen' | 'marker' | 'eraser' | 'text';
  setMode: Dispatch<SetStateAction<'none' | 'pen' | 'marker' | 'eraser' | 'text'>>;
  color: string;
  setColor: Dispatch<SetStateAction<string>>;
  penWidth: number;
  setPenWidth: Dispatch<SetStateAction<number>>;
  markerWidth: number;
  setMarkerWidth: Dispatch<SetStateAction<number>>;
  eraserWidth: number;
  setEraserWidth: Dispatch<SetStateAction<number>>;
  seconds: number;
  isRunning: boolean;
  setIsRunning: Dispatch<SetStateAction<boolean>>;
  setIsSidebarOpen: Dispatch<SetStateAction<boolean>>;
};

export default function PdfToolbar({
  mode, setMode, color, setColor,
  penWidth, setPenWidth, markerWidth, setMarkerWidth, eraserWidth, setEraserWidth,
  seconds, isRunning, setIsRunning, setIsSidebarOpen
}: PdfToolbarProps) {
  const [showPalette, setShowPalette] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const currentWidth = mode === 'marker' ? markerWidth : (mode === 'eraser' ? eraserWidth : penWidth);
  const setWidth = mode === 'marker' ? setMarkerWidth : (mode === 'eraser' ? setEraserWidth : setPenWidth);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setShowPalette(false);
      }
    };
    const handleCanvasInteract = () => setShowPalette(false);

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('canvas-interact', handleCanvasInteract);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('canvas-interact', handleCanvasInteract);
    };
  }, []);

  const handleToolClick = (selectedMode: 'none' | 'pen' | 'marker' | 'eraser' | 'text') => {
    if (mode === selectedMode && (selectedMode === 'pen' || selectedMode === 'marker' || selectedMode === 'eraser')) {
      setShowPalette(!showPalette);
    } else {
      setMode(selectedMode);
      if (selectedMode === 'pen' || selectedMode === 'marker' || selectedMode === 'eraser') {
        setShowPalette(true);
      } else {
        setShowPalette(false);
      }
    }
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleClearAll = () => {
    if (window.confirm('現在のページの書き込み（テキスト含む）をすべて消去しますか？')) {
      document.dispatchEvent(new Event('clear-canvas'));
      setShowPalette(false);
    }
  };

  return (
    <div ref={toolbarRef} className="w-full h-12 bg-[#1c1c1e] border-b border-white/10 flex items-center justify-between px-2 shadow-md relative z-[100] select-none">
      <div className="flex items-center gap-1 h-full">
        <button onClick={() => setIsSidebarOpen(prev => !prev)} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors mr-2">
          <Menu size={20} />
        </button>

        <button onClick={() => handleToolClick('none')} className={`p-2 rounded-md transition-colors ${mode === 'none' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
          <MousePointer2 size={18} />
        </button>
        
        <div className="w-[1px] h-5 bg-white/10 mx-1" />
        
        <button onClick={() => handleToolClick('pen')} className={`p-2 rounded-md transition-colors flex items-center gap-1 ${mode === 'pen' ? 'bg-white/10 text-indigo-400' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
          <PenTool size={18} />
          {mode === 'pen' && <ChevronDown size={12} className="opacity-50" />}
        </button>
        
        <button onClick={() => handleToolClick('marker')} className={`p-2 rounded-md transition-colors flex items-center gap-1 ${mode === 'marker' ? 'bg-white/10 text-yellow-400' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
          <Highlighter size={18} />
          {mode === 'marker' && <ChevronDown size={12} className="opacity-50" />}
        </button>

        <button onClick={() => handleToolClick('eraser')} className={`p-2 rounded-md transition-colors flex items-center gap-1 ${mode === 'eraser' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
          <Eraser size={18} />
          {mode === 'eraser' && <ChevronDown size={12} className="opacity-50" />}
        </button>

        <button onClick={() => handleToolClick('text')} className={`p-2 rounded-md transition-colors ${mode === 'text' ? 'bg-white/10 text-indigo-400' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
          <Type size={18} />
        </button>
      </div>

      <div className="flex items-center h-full pr-2">
        <button onClick={() => setIsRunning(!isRunning)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-md transition-colors group">
          {/* 🌟 修正：動いている時はPauseアイコン、止まっている時はPlayアイコンにする */}
          {isRunning ? (
            <Pause className="w-4 h-4 text-amber-400 fill-current animate-pulse" />
          ) : (
            <Play className="w-4 h-4 text-indigo-400 fill-current ml-0.5 group-hover:scale-110 transition-transform" />
          )}
          <span className="text-white font-black font-mono text-base tracking-wider w-12 text-center">{formatTime(seconds)}</span>
        </button>
      </div>

      {showPalette && (mode === 'pen' || mode === 'marker' || mode === 'eraser') && (
        <div className="absolute top-12 left-12 bg-[#1c1c1e] border border-white/10 border-t-0 p-5 rounded-b-2xl shadow-2xl animate-in fade-in slide-in-from-top-1 duration-200 w-64 origin-top">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">太さ</span>
            <span className="text-[10px] font-black text-indigo-400">{currentWidth}px</span>
          </div>
          <input 
            type="range" min="1" max={mode === 'eraser' ? "100" : "50"} value={currentWidth} 
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500 mb-5"
          />
          
          {mode !== 'eraser' && (
            <>
              <div className="text-[10px] font-black text-white/40 mb-3 uppercase tracking-widest">カラー</div>
              <div className="grid grid-cols-5 gap-3">
                {['#000000', '#ef4444', '#3b82f6', '#22c55e', '#eab308'].map((c) => (
                  <button 
                    key={c} onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-110 shadow-lg shadow-white/20' : 'border-transparent opacity-50 hover:opacity-100'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </>
          )}

          {mode === 'eraser' && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <button 
                onClick={handleClearAll}
                className="w-full py-2.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 size={16} /> すべて消去
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}