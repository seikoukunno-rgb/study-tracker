// components/DrawingCanvas.tsx
'use client';

import { useRef, useState, useEffect } from 'react';

type DrawingCanvasProps = {
  isDrawingMode: boolean;
  pageIndex: number;
};

export default function DrawingCanvas({ isDrawingMode, pageIndex }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // PDFのサイズに合わせて透明なキャンバス（画用紙）のサイズを調整する
  useEffect(() => {
    const initCanvas = () => {
      const canvas = canvasRef.current;
      const parent = canvas?.parentElement;
      if (canvas && parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = '#ef4444'; // ペンの色（赤）
        }
      }
    };
    // ページが表示されてからサイズを合わせるために少し待つ
    const timer = setTimeout(initCanvas, 500);
    window.addEventListener('resize', initCanvas);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', initCanvas);
    };
  }, []);

  // 描き始め
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingMode) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  // 描いている途中
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isDrawingMode) return;
    if ('touches' in e && e.cancelable) e.preventDefault(); // スマホで描く時に画面がスクロールするのを防ぐ

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  // 描き終わり
  const stopDrawing = () => setIsDrawing(false);

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
      onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
      className={`absolute top-0 left-0 z-10 w-full h-full ${
        // 書き込みモードの時だけペンが反応し、OFFの時は下のPDFが触れるようにする
        isDrawingMode ? 'cursor-crosshair pointer-events-auto touch-none' : 'pointer-events-none'
      }`}
    />
  );
}