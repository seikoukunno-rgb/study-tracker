// components/PdfToolbar.tsx
'use client';

import { Pen, Highlighter, Eraser, Type, ChevronDown, MousePointer2 } from 'lucide-react';

export default function PdfToolbar({ 
  mode, setMode, color, setColor, penWidth, setPenWidth, markerWidth, setMarkerWidth, eraserWidth, setEraserWidth 
}: any) {
  
  // 今選んでいるツールの太さを取得
  const currentWidth = mode === 'marker' ? markerWidth : (mode === 'eraser' ? eraserWidth : penWidth);
  const setWidth = mode === 'marker' ? setMarkerWidth : (mode === 'eraser' ? setEraserWidth : setPenWidth);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2">
      {/* メインツールバー */}
      <div className="bg-[#1c1c1e]/90 backdrop-blur-xl border border-white/10 p-1 rounded-xl flex items-center gap-1 shadow-2xl">
        <button onClick={() => setMode('none')} className={`p-2 rounded-lg transition-colors ${mode === 'none' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}><MousePointer2 size={18} /></button>
        <div className="w-[1px] h-4 bg-white/10 mx-1" />
        <button onClick={() => setMode('pen')} className={`p-2 rounded-lg transition-colors ${mode === 'pen' ? 'bg-white/10 text-indigo-400' : 'text-white/40 hover:text-white'}`}><Pen size={18} /></button>
        <button onClick={() => setMode('marker')} className={`p-2 rounded-lg transition-colors ${mode === 'marker' ? 'bg-white/10 text-yellow-400' : 'text-white/40 hover:text-white'}`}><Highlighter size={18} /></button>
        <button onClick={() => setMode('eraser')} className={`p-2 rounded-lg transition-colors ${mode === 'eraser' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}><Eraser size={18} /></button>
        <button onClick={() => setMode('text')} className={`p-2 rounded-lg transition-colors ${mode === 'text' ? 'bg-white/10 text-indigo-400' : 'text-white/40 hover:text-white'}`}><Type size={18} /></button>
      </div>

      {/* 🌟 展開パレット（ツールが選択されている時だけ表示） */}
      {mode !== 'none' && (
        <div className="bg-[#1c1c1e]/95 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 w-64 origin-top">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">太さ</span>
            <span className="text-[10px] font-black text-indigo-400">{currentWidth}px</span>
          </div>
          <input 
            type="range" min="1" max="50" value={currentWidth} 
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500 mb-6"
          />
          
          {mode !== 'eraser' && (
            <>
              <div className="text-[10px] font-black text-white/40 mb-3 uppercase tracking-widest">カラーパレット</div>
              <div className="grid grid-cols-5 gap-3">
                {['#000000', '#ef4444', '#3b82f6', '#22c55e', '#eab308'].map((c) => (
                  <button 
                    key={c} onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-125 shadow-lg shadow-white/20' : 'border-transparent opacity-50 hover:opacity-100'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}