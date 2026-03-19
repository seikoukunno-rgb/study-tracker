// components/DrawingCanvas.tsx
'use client';

import { useRef, useState, useEffect } from 'react';

type DrawingCanvasProps = {
  // 🌟 マーカー（蛍光ペン）を追加
  mode: 'none' | 'pen' | 'marker' | 'eraser';
  color: string; // 🌟 ペンの色を受け取る
  pageIndex: number;
};

export default function DrawingCanvas({ mode, color, pageIndex }: DrawingCanvasProps) {
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

    // 🌟 モード別の設定（マーカーは太く半透明、消しゴムは透明にして消す）
    ctx.globalCompositeOperation = mode === 'eraser' ? 'destination-out' : (mode === 'marker' ? 'multiply' : 'source-over');
    ctx.lineWidth = mode === 'eraser' ? 30 : (mode === 'marker' ? 18 : 3); 
    ctx.globalAlpha = mode === 'marker' ? 0.4 : 1.0; // マーカーは透けるように
    ctx.strokeStyle = mode === 'eraser' ? 'rgba(0,0,0,1)' : color;

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