// components/DrawingCanvas.tsx
'use client';

import { useRef, useState, useEffect } from 'react';

type DrawingCanvasProps = {
  // 🌟 モードを「なし」「ペン」「消しゴム」の3種類に変更！
  mode: 'none' | 'pen' | 'eraser';
  pageIndex: number;
};

export default function DrawingCanvas({ mode, pageIndex }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const initCanvas = () => {
      const canvas = canvasRef.current;
      const parent = canvas?.parentElement;
      if (canvas && parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
      }
    };
    const timer = setTimeout(initCanvas, 500);
    window.addEventListener('resize', initCanvas);
    return () => { clearTimeout(timer); window.removeEventListener('resize', initCanvas); };
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode === 'none') return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    // 🌟 ペンなら「上書き(赤)」、消しゴムなら「透明にして消す(太め)」
    ctx.globalCompositeOperation = mode === 'eraser' ? 'destination-out' : 'source-over';
    ctx.lineWidth = mode === 'eraser' ? 25 : 3; 
    ctx.strokeStyle = '#ef4444';

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || mode === 'none') return;
    if ('touches' in e && e.cancelable) e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
      onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
      className={`absolute top-0 left-0 z-10 w-full h-full ${
        mode !== 'none' ? 'cursor-crosshair pointer-events-auto touch-none' : 'pointer-events-none'
      }`}
    />
  );
}