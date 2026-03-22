// components/DrawingCanvas.tsx
'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
// 🌟 ズーム状態を取得するためのフックを追加
import { useTransformContext } from "react-zoom-pan-pinch";

type DrawingCanvasProps = {
  mode: 'none' | 'pen' | 'marker' | 'eraser' | 'text';
  color: string;
  // 🌟 各ツールの太さを受け取るように拡張
  penWidth: number;
  markerWidth: number;
  eraserWidth: number;
  pageIndex: number;
};

type Point = { x: number; y: number };
// 🌟 データ構造に太さ(width)を追加
type PathData = { mode: 'pen' | 'marker' | 'eraser'; color: string; width: number; points: Point[] };
type TextData = { text: string; x: number; y: number; color: string };

export default function DrawingCanvas({ mode, color, penWidth, markerWidth, eraserWidth, pageIndex }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [textInput, setTextInput] = useState<{ x: number; y: number } | null>(null);
  const [textValue, setTextValue] = useState("");

  // 🌟 ズームコンテキストを取得
  const transformContext = useTransformContext();

  const pathsRef = useRef<PathData[]>([]);
  const textsRef = useRef<TextData[]>([]);
  const currentPathRef = useRef<Point[]>([]);

  // 再描画関数
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. 過去の線を描画
    pathsRef.current.forEach((path) => {
      if (path.points.length === 0) return;
      ctx.globalCompositeOperation = path.mode === 'eraser' ? 'destination-out' : (path.mode === 'marker' ? 'multiply' : 'source-over');
      // 🌟 保存されている太さを使う
      ctx.lineWidth = path.width;
      ctx.globalAlpha = path.mode === 'marker' ? 0.4 : 1.0;
      ctx.strokeStyle = path.mode === 'eraser' ? 'rgba(0,0,0,1)' : path.color;

      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      path.points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    });

    // 2. 現在描画中の線を描画
    if (currentPathRef.current.length > 0 && mode !== 'none' && mode !== 'text') {
      ctx.globalCompositeOperation = mode === 'eraser' ? 'destination-out' : (mode === 'marker' ? 'multiply' : 'source-over');
      // 🌟 現在のモードに応じた Props の太さを使う
      ctx.lineWidth = mode === 'eraser' ? eraserWidth : (mode === 'marker' ? markerWidth : penWidth);
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
  }, [mode, color, penWidth, markerWidth, eraserWidth]);

  useEffect(() => {
    const initCanvas = () => {
      const canvas = canvasRef.current;
      const parent = canvas?.parentElement;
      if (canvas && parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        redraw();
      }
    };
    const timer = setTimeout(initCanvas, 500);
    window.addEventListener('resize', initCanvas);
    return () => { clearTimeout(timer); window.removeEventListener('resize', initCanvas); };
  }, [redraw]);

  // 🌟 ズーム倍率を考慮して座標を補正する関数
  const getCorrectedCoordinates = (clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // 現在のズーム倍率を取得（デフォルトは1）
    const scale = transformContext.transformState.scale || 1;

    // 🌟 クリック位置をスケールで割り算して、PDF本来の座標に戻す
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode === 'none') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    // 🌟 補正済み座標を取得
    const { x, y } = getCorrectedCoordinates(clientX, clientY);

    if (mode === 'text') {
      // 🌟 テキストボックス機能：クリック位置に `<input>` を出す状態にする
      setTextInput({ x, y });
      setTextValue("");
      return;
    }

    setIsDrawing(true);
    currentPathRef.current = [{ x, y }];
    redraw();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || mode === 'none' || mode === 'text') return;
    if ('touches' in e && e.cancelable) e.preventDefault();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    // 🌟 補正済み座標を取得
    const { x, y } = getCorrectedCoordinates(clientX, clientY);

    currentPathRef.current.push({ x, y });
    redraw();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPathRef.current.length > 0) {
      // 🌟 描き終わった時の太さ(width)も一緒に保存する
      const width = mode === 'eraser' ? eraserWidth : (mode === 'marker' ? markerWidth : penWidth);
      pathsRef.current.push({ mode: mode as any, color, width, points: [...currentPathRef.current] });
      currentPathRef.current = [];
    }
  };

  const handleTextSubmit = () => {
    if (textValue.trim() && textInput) {
      // 🌟 テキスト確定：キャンバス描画用データに追加
      textsRef.current.push({ text: textValue, x: textInput.x, y: textInput.y + 6, color });
      redraw();
    }
    setTextInput(null);
    setTextValue("");
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
      {/* 🌟 テキストボックス機能：HTMLのinputを絶対配置で重ねる */}
      {textInput && (
        <input
          type="text" autoFocus value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          // 確定アクション
          onBlur={handleTextSubmit} 
          onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
          className="absolute z-20 bg-white/90 border-2 border-indigo-500 rounded px-2 py-1 outline-none shadow-xl"
          style={{ 
            // 🌟 座標はPDF本来の座標なので、CSSの `transform` でズームに追従させる必要がある
            left: textInput.x, 
            top: textInput.y - 14, 
            color, 
            fontSize: '20px', 
            fontWeight: 'bold',
            transformOrigin: 'top left',
            // 🌟 ズームに応じて input 自体の大きさも変える（react-pdfのPageと同じ親にいる前提）
            transform: `scale(${1 / (transformContext.transformState.scale || 1)})` 
          }}
          placeholder="文字を入力..."
        />
      )}
    </>
  );
}