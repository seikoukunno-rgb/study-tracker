'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useTransformContext } from "react-zoom-pan-pinch";
import { supabase } from '@/lib/supabase';

type DrawingCanvasProps = {
  mode: 'none' | 'pen' | 'marker' | 'eraser' | 'text';
  color: string;
  penWidth: number;
  markerWidth: number;
  eraserWidth: number;
  pageIndex: number;
  pdfId?: string; 
};

type Point = { x: number; y: number };
type PathData = { mode: 'pen' | 'marker' | 'eraser'; color: string; width: number; points: Point[] };
// 🌟 width を追加して、リサイズされた幅を記憶できるように拡張
type TextData = { text: string; x: number; y: number; width: number; color: string };

export default function DrawingCanvas({ mode, color, penWidth, markerWidth, eraserWidth, pageIndex, pdfId = 'default-pdf' }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [textInput, setTextInput] = useState<{ x: number; y: number } | null>(null);
  const [textValue, setTextValue] = useState("");
  const [statusMsg, setStatusMsg] = useState<string>("");

  const transformContext = useTransformContext();
  const pathsRef = useRef<PathData[]>([]);
  const textsRef = useRef<TextData[]>([]);
  const currentPathRef = useRef<Point[]>([]);

  const textValueRef = useRef("");
  const textInputRef = useRef<{ x: number; y: number } | null>(null);
  // 🌟 入力中の textarea の幅をリアルタイムに追跡する Ref
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textValueRef.current = textValue; }, [textValue]);
  useEffect(() => { textInputRef.current = textInput; }, [textInput]);

  // 🌟 Canvasでテキストを折り返して描画するためのヘルパー関数
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const lines = text.split('\n');
    let currentY = y;

    lines.forEach(line => {
      let words = line.split(''); // 日本語対応のため文字単位で分割
      let currentLine = '';

      for (let n = 0; n < words.length; n++) {
        let testLine = currentLine + words[n];
        let metrics = ctx.measureText(testLine);
        let testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(currentLine, x, currentY);
          currentLine = words[n];
          currentY += lineHeight;
        } else {
          currentLine = testLine;
        }
      }
      ctx.fillText(currentLine, x, currentY);
      currentY += lineHeight;
    });
  };

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. パスの描画
    pathsRef.current.forEach((path) => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = path.mode === 'eraser' ? 'destination-out' : (path.mode === 'marker' ? 'multiply' : 'source-over');
      ctx.lineWidth = path.width;
      ctx.globalAlpha = path.mode === 'marker' ? 0.4 : 1.0;
      ctx.strokeStyle = path.mode === 'eraser' ? 'rgba(0,0,0,1)' : path.color;
      ctx.beginPath();
      if (path.points.length > 0) {
        ctx.moveTo(path.points[0].x, path.points[0].y);
        path.points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      }
    });

    // 2. 現在描画中のパス
    if (currentPathRef.current.length > 0 && mode !== 'none' && mode !== 'text') {
      ctx.globalCompositeOperation = mode === 'eraser' ? 'destination-out' : (mode === 'marker' ? 'multiply' : 'source-over');
      ctx.lineWidth = mode === 'eraser' ? eraserWidth : (mode === 'marker' ? markerWidth : penWidth);
      ctx.globalAlpha = mode === 'marker' ? 0.4 : 1.0;
      ctx.strokeStyle = mode === 'eraser' ? 'rgba(0,0,0,1)' : color;
      ctx.beginPath();
      ctx.moveTo(currentPathRef.current[0].x, currentPathRef.current[0].y);
      currentPathRef.current.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }

    // 3. テキストの描画（折り返し対応）
    textsRef.current.forEach((t) => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.font = 'bold 20px sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillStyle = t.color;
      // 🌟 幅(t.width)を指定して折り返し描画を実行
      wrapText(ctx, t.text, t.x, t.y, t.width, 24); 
    });
  }, [mode, color, penWidth, markerWidth, eraserWidth]);

  // 読み込み・保存ロジック（そのまま）
  useEffect(() => {
    const loadAnnotations = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('annotations').select('data').eq('user_id', user.id).eq('pdf_id', pdfId).eq('page_index', pageIndex).maybeSingle();
      if (data?.data) {
        pathsRef.current = data.data.paths || [];
        textsRef.current = data.data.texts || [];
        redraw();
      }
    };
    loadAnnotations();
  }, [pageIndex, pdfId, redraw]);

  const saveAnnotations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('annotations').upsert({
      user_id: user.id, pdf_id: pdfId, page_index: pageIndex,
      data: { paths: pathsRef.current, texts: textsRef.current },
      updated_at: new Date().toISOString(),
    });
  };

  // 🌟 テキスト確定時に「幅」も保存するように修正
  const handleTextSubmit = useCallback(() => {
    const val = textValueRef.current;
    const pos = textInputRef.current;
    const width = textAreaRef.current?.clientWidth || 200; // 🌟 現在の幅を取得

    textValueRef.current = "";
    textInputRef.current = null;

    if (val.trim() && pos) {
      // 🌟 width をデータに含める
      textsRef.current.push({ text: val, x: pos.x, y: pos.y, width: width, color });
      redraw();
      saveAnnotations();
    }
    setTextInput(null);
    setTextValue("");
  }, [color, redraw]);

  // 初期化・座標変換ロジック（そのまま）
  const getCorrectedCoordinates = (clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scale = transformContext.transformState.scale || 1;
    return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode === 'none') return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const { x, y } = getCorrectedCoordinates(clientX, clientY);

    if (mode === 'text') {
      if (textInputRef.current && textValueRef.current.trim()) handleTextSubmit();
      setTextInput({ x, y });
      setTextValue("");
      return;
    }
    setIsDrawing(true);
    currentPathRef.current = [{ x, y }];
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || mode === 'none' || mode === 'text') return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const { x, y } = getCorrectedCoordinates(clientX, clientY);
    currentPathRef.current.push({ x, y });
    redraw();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPathRef.current.length > 0) {
      const width = mode === 'eraser' ? eraserWidth : (mode === 'marker' ? markerWidth : penWidth);
      pathsRef.current.push({ mode: mode as any, color, width, points: [...currentPathRef.current] });
      currentPathRef.current = [];
      saveAnnotations();
    }
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
        onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
        className={`absolute top-0 left-0 z-10 w-full h-full touch-none ${mode !== 'none' ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}`}
      />
      
      {textInput && (
        /* 🌟 input から textarea に変更 */
        <textarea
          ref={textAreaRef}
          autoFocus
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onBlur={handleTextSubmit} 
          className="absolute z-20 bg-white/90 border-2 border-indigo-600 rounded p-2 outline-none shadow-2xl text-black font-bold leading-tight"
          style={{ 
            left: textInput.x, 
            top: textInput.y, 
            color, 
            fontSize: '20px',
            transformOrigin: 'top left',
            // 🌟 Zoom倍率に合わせて textarea 自体も逆スケールさせて見た目の大きさを保つ
            transform: `scale(${1 / (transformContext.transformState.scale || 1)})`,
            // 🌟 自由にリサイズできるようにする
            resize: 'both',
            minWidth: '150px',
            minHeight: '40px',
            overflow: 'hidden'
          }}
          placeholder="文字を入力..."
        />
      )}
    </>
  );
}