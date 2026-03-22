// components/DrawingCanvas.tsx
'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

type DrawingCanvasProps = {
  mode: 'none' | 'pen' | 'marker' | 'eraser' | 'text'; // 🌟 text追加
  color: string;
  pageIndex: number;
};

type Point = { x: number; y: number };
type PathData = { mode: 'pen' | 'marker' | 'eraser'; color: string; points: Point[] };
type TextData = { text: string; x: number; y: number; color: string };

export default function DrawingCanvas({ mode, color, pageIndex }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [textInput, setTextInput] = useState<{ x: number; y: number } | null>(null);
  const [textValue, setTextValue] = useState("");

  // 🌟 描画データをすべて記憶する（これでリサイズしても消えない＆マーカーが綺麗になる）
  const pathsRef = useRef<PathData[]>([]);
  const textsRef = useRef<TextData[]>([]);
  const currentPathRef = useRef<Point[]>([]);

  // キャンバスを再描画する魔法の関数
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. 過去の線をすべて描画
    pathsRef.current.forEach((path) => {
      if (path.points.length === 0) return;
      ctx.globalCompositeOperation = path.mode === 'eraser' ? 'destination-out' : (path.mode === 'marker' ? 'multiply' : 'source-over');
      ctx.lineWidth = path.mode === 'eraser' ? 30 : (path.mode === 'marker' ? 18 : 3);
      ctx.globalAlpha = path.mode === 'marker' ? 0.4 : 1.0;
      ctx.strokeStyle = path.mode === 'eraser' ? 'rgba(0,0,0,1)' : path.color;

      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      path.points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    });

    // 2. 今まさに描いている線を描画
    if (currentPathRef.current.length > 0 && mode !== 'none' && mode !== 'text') {
      ctx.globalCompositeOperation = mode === 'eraser' ? 'destination-out' : (mode === 'marker' ? 'multiply' : 'source-over');
      ctx.lineWidth = mode === 'eraser' ? 30 : (mode === 'marker' ? 18 : 3);
      ctx.globalAlpha = mode === 'marker' ? 0.4 : 1.0;
      ctx.strokeStyle = mode === 'eraser' ? 'rgba(0,0,0,1)' : color;

      ctx.beginPath();
      ctx.moveTo(currentPathRef.current[0].x, currentPathRef.current[0].y);
      currentPathRef.current.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }

    // 3. テキストを描画
    textsRef.current.forEach((t) => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    });
  }, [mode, color]);

  useEffect(() => {
    const initCanvas = () => {
      const canvas = canvasRef.current;
      const parent = canvas?.parentElement;
      if (canvas && parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        redraw(); // リサイズ時に消えないように再描画
      }
    };
    const timer = setTimeout(initCanvas, 500);
    window.addEventListener('resize', initCanvas);
    return () => { clearTimeout(timer); window.removeEventListener('resize', initCanvas); };
  }, [redraw]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode === 'none') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

    if (mode === 'text') {
      setTextInput({ x, y });
      setTextValue("");
      return;
    }

    setIsDrawing(true);
    currentPathRef.current = [{ x, y }]; // 新しい線をスタート
    redraw();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || mode === 'none' || mode === 'text') return;
    if ('touches' in e && e.cancelable) e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

    currentPathRef.current.push({ x, y }); // 点を追加
    redraw();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPathRef.current.length > 0) {
      // 描き終わったら過去の線リストに保存
      pathsRef.current.push({ mode: mode as any, color, points: [...currentPathRef.current] });
      currentPathRef.current = [];
    }
  };

  const handleTextSubmit = () => {
    if (textValue.trim() && textInput) {
      textsRef.current.push({ text: textValue, x: textInput.x, y: textInput.y + 6, color });
      redraw();
    }
    setTextInput(null);
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
        onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
        className={`absolute top-0 left-0 z-10 w-full h-full ${
          mode !== 'none' ? 'cursor-crosshair pointer-events-auto touch-none' : 'pointer-events-none'
        }`}
      />
      {textInput && (
        <input
          type="text" autoFocus value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onBlur={handleTextSubmit} onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
          className="absolute z-20 bg-white/90 border-2 border-indigo-500 rounded px-2 py-1 outline-none shadow-xl"
          style={{ left: textInput.x, top: textInput.y - 14, color, fontSize: '20px', fontWeight: 'bold' }}
          placeholder="Enterで確定"
        />
      )}
    </>
  );
}