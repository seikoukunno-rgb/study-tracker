'use client';

import { useState, useRef, useEffect, Dispatch, SetStateAction } from 'react';
// 🌟 GripVertical (掴むハンドル) と Hand を追加
import { PenTool, Highlighter, Eraser, Type, Hand, GripVertical } from 'lucide-react';

type FloatingToolbarProps = {
  drawingMode: 'none' | 'pen' | 'marker' | 'eraser' | 'text';
  setDrawingMode: Dispatch<SetStateAction<'none' | 'pen' | 'marker' | 'eraser' | 'text'>>;
  drawingColor: string;
  setDrawingColor: Dispatch<SetStateAction<string>>;
};

export default function FloatingToolbar({
  drawingMode,
  setDrawingMode,
  drawingColor,
  setDrawingColor,
}: FloatingToolbarProps) {
  // 🌟 ツールバーの位置状態 (初期位置: スマホなら上中央、PCなら左上など適宜調整)
  // ここでは初期値を設定しておき、ViewerPageからPropsで受け取っても良い
  const [position, setPosition] = useState({ x: 100, y: 80 }); 
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  // 🌟 ドラッグ開始ロジック
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    // ハンドル（GripVertical）の部分だけ掴めるようにする
    if (!(e.target as HTMLElement).closest('.drag-handle')) return;

    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (toolbarRef.current) {
      const rect = toolbarRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    }
  };

  // 🌟 ドラッグ中＆終了ロジック (windowレベルで監視)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      // スマホのスクロールを防ぐ
      if ('touches' in e && e.cancelable) e.preventDefault(); 

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      // 画面外にはみ出さないように制限をかけるとなお良し
      let nextX = clientX - dragOffset.current.x;
      let nextY = clientY - dragOffset.current.y;
      
      setPosition({ x: nextX, y: nextY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={toolbarRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      // 🌟 `fixed` に変更し、`style` で位置を指定。`touch-none` を追加
      className="fixed z-[100] bg-black/90 backdrop-blur-xl px-2 py-2 rounded-full flex items-center gap-1 border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.8)] w-max touch-none transition-shadow duration-300"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {/* 🌟 ドラッグ用ハンドル（点々アイコン） */}
      <div className="drag-handle p-1 text-white/20 hover:text-white/60 transition-colors cursor-move mr-1">
        <GripVertical className="w-5 h-5" />
      </div>

      {/* --- 元のツールバーのボタン群 --- */}
      {/* 移動モード */}
      <button
        onClick={() => setDrawingMode('none')}
        className={`p-2 rounded-full transition-colors ${
          drawingMode === 'none' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/10'
        }`}
      >
        <Hand className="w-5 h-5" />
      </button>

      <div className="w-[1px] h-6 bg-white/20 mx-1" />

      {/* ツール群 */}
      <button
        onClick={() => setDrawingMode('pen')}
        className={`p-2 rounded-full transition-colors ${
          drawingMode === 'pen' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/10'
        }`}
      >
        <PenTool className="w-5 h-5" />
      </button>
      <button
        onClick={() => setDrawingMode('marker')}
        className={`p-2 rounded-full transition-colors ${
          drawingMode === 'marker' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/10'
        }`}
      >
        <Highlighter className="w-5 h-5" />
      </button>
      <button
        onClick={() => setDrawingMode('eraser')}
        className={`p-2 rounded-full transition-colors ${
          drawingMode === 'eraser' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/10'
        }`}
      >
        <Eraser className="w-5 h-5" />
      </button>
      <button
        onClick={() => setDrawingMode('text')}
        className={`p-2 rounded-full transition-colors ${
          drawingMode === 'text' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/10'
        }`}
      >
        <Type className="w-5 h-5" />
      </button>

      <div className="w-[1px] h-6 bg-white/20 mx-1" />

      {/* 色選択 */}
      <div className="flex gap-2 items-center mr-2">
        {['#ef4444', '#3b82f6', '#eab308'].map((c) => (
          <button
            key={c}
            onClick={() => setDrawingColor(c)}
            className={`w-6 h-6 rounded-full border-2 transition-transform ${
              drawingColor === c ? 'border-white scale-125' : 'border-transparent'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}