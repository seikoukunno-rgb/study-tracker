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
  
  // 🌟 テキストボックスの幅(w)と高さ(h)も状態として持つ
  const [textInput, setTextInput] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [textValue, setTextValue] = useState("");
  const [statusMsg, setStatusMsg] = useState<string>("");

  const transformContext = useTransformContext();
  const pathsRef = useRef<PathData[]>([]);
  const textsRef = useRef<TextData[]>([]);
  const currentPathRef = useRef<Point[]>([]);

  const textValueRef = useRef("");
  const textInputRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  
  // 青いドットでのリサイズ用フラグ
  const isResizing = useRef(false);

  useEffect(() => { textValueRef.current = textValue; }, [textValue]);
  useEffect(() => { textInputRef.current = textInput; }, [textInput]);

  // 🌟 Canvasでテキストを折り返して描画するためのヘルパー関数
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const lines = text.split('\n');
    let currentY = y;

    lines.forEach(line => {
      let words = line.split(''); // 日本語対応のため1文字ずつ判定
      let currentLine = '';

      for (let n = 0; n < words.length; n++) {
        let testLine = currentLine + words[n];
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
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
    
    pathsRef.current.forEach((path) => {
      if (path.points.length === 0) return;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = path.mode === 'eraser' ? 'destination-out' : (path.mode === 'marker' ? 'multiply' : 'source-over');
      ctx.lineWidth = path.width;
      ctx.globalAlpha = path.mode === 'marker' ? 0.4 : 1.0;
      ctx.strokeStyle = path.mode === 'eraser' ? 'rgba(0,0,0,1)' : path.color;
      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      path.points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    });

    if (currentPathRef.current.length > 0 && mode !== 'none' && mode !== 'text') {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = mode === 'eraser' ? 'destination-out' : (mode === 'marker' ? 'multiply' : 'source-over');
      ctx.lineWidth = mode === 'eraser' ? eraserWidth : (mode === 'marker' ? markerWidth : penWidth);
      ctx.globalAlpha = mode === 'marker' ? 0.4 : 1.0;
      ctx.strokeStyle = mode === 'eraser' ? 'rgba(0,0,0,1)' : color;
      ctx.beginPath();
      ctx.moveTo(currentPathRef.current[0].x, currentPathRef.current[0].y);
      currentPathRef.current.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }

    textsRef.current.forEach((t) => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.font = 'bold 20px sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillStyle = t.color;
      // 🌟 幅(t.width)を指定して折り返し描画
      wrapText(ctx, t.text, t.x, t.y, t.width, 24); 
    });
  }, [mode, color, penWidth, markerWidth, eraserWidth]);

  useEffect(() => {
    const loadAnnotations = async () => {
      setStatusMsg("読み込み中...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatusMsg(""); return; }
      const { data, error } = await supabase.from('annotations').select('data').eq('user_id', user.id).eq('pdf_id', pdfId).eq('page_index', pageIndex).maybeSingle();
      if (error) { setStatusMsg("❌ 読込エラー"); return; }
      if (data?.data) {
        pathsRef.current = data.data.paths || [];
        textsRef.current = data.data.texts || [];
        setStatusMsg("✅ データ復元完了");
      } else {
        pathsRef.current = [];
        textsRef.current = [];
      }
      redraw();
      setTimeout(() => setStatusMsg(""), 3000);
    };
    loadAnnotations();
  }, [pageIndex, pdfId, redraw]);

  const saveAnnotations = async () => {
    setStatusMsg("💾 保存中...");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('annotations').upsert({
      user_id: user.id, pdf_id: pdfId, page_index: pageIndex,
      data: { paths: pathsRef.current, texts: textsRef.current },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id, pdf_id, page_index' });
    if (!error) {
      setStatusMsg("🚀 保存成功！");
      setTimeout(() => setStatusMsg(""), 3000);
    }
  };

  const handleTextSubmit = useCallback(() => {
    const val = textValueRef.current;
    const pos = textInputRef.current;
    textValueRef.current = "";
    textInputRef.current = null;

    if (val.trim() && pos) {
      // 🌟 幅(w)も保存する
      textsRef.current.push({ text: val, x: pos.x, y: pos.y, width: pos.w, color });
      redraw();
      saveAnnotations();
    }
    setTextInput(null);
    setTextValue("");
  }, [color, redraw]);

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

  const getCorrectedCoordinates = (clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scale = transformContext.transformState.scale || 1;
    return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
  };

  const stopEvent = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation();
  };

  const cancelDrawing = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      currentPathRef.current = [];
      redraw();
    }
  }, [isDrawing, redraw]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    // 🌟 リサイズ中なら描画開始しない
    if (isResizing.current) return;
    if (mode === 'none') return;
    
    if ('touches' in e) {
      if (e.touches.length >= 2) { cancelDrawing(); return; }
      stopEvent(e);
    } else {
      stopEvent(e);
    }
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const { x, y } = getCorrectedCoordinates(clientX, clientY);

    if (mode === 'text') {
      if (textInputRef.current && textValueRef.current.trim()) {
        handleTextSubmit();
      }
      // 🌟 初期サイズを w: 200, h: 50 に設定
      setTextInput({ x, y, w: 200, h: 50 });
      setTextValue("");
      return;
    }

    setIsDrawing(true);
    currentPathRef.current = [{ x, y }];
    redraw();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || mode === 'none' || mode === 'text') return;
    if ('touches' in e) {
      if (e.touches.length >= 2) { cancelDrawing(); return; }
      stopEvent(e);
      if (e.cancelable) e.preventDefault();
    } else {
      stopEvent(e);
    }
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const { x, y } = getCorrectedCoordinates(clientX, clientY);
    currentPathRef.current.push({ x, y });
    redraw();
  };

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    if ('touches' in e && e.touches.length > 0) { cancelDrawing(); return; }
    setIsDrawing(false);
    
    if (currentPathRef.current.length > 0) {
      const width = mode === 'eraser' ? eraserWidth : (mode === 'marker' ? markerWidth : penWidth);
      pathsRef.current.push({ mode: mode as any, color, width, points: [...currentPathRef.current] });
      currentPathRef.current = [];
      saveAnnotations();
    }
  };

  // 🌟 青いドットをドラッグした時のリサイズ処理
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    isResizing.current = true;
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startW = textInput?.w || 200;
    const startH = textInput?.h || 50;

    const scale = transformContext.transformState.scale || 1;

    const doResize = (moveEvent: MouseEvent | TouchEvent) => {
      if (!isResizing.current) return;
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const clientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : (moveEvent as MouseEvent).clientY;
      
      setTextInput(prev => {
        if (!prev) return prev;
        // ズーム倍率を考慮してリサイズ量を計算
        const newW = Math.max(100, startW + (clientX - startX) / scale);
        const newH = Math.max(40, startH + (clientY - startY) / scale);
        return { ...prev, w: newW, h: newH };
      });
    };

    const stopResize = () => {
      isResizing.current = false;
      window.removeEventListener('mousemove', doResize);
      window.addEventListener('mouseup', stopResize);
      window.removeEventListener('touchmove', doResize);
      window.addEventListener('touchend', stopResize);
    };

    window.addEventListener('mousemove', doResize);
    window.addEventListener('mouseup', stopResize);
    window.addEventListener('touchmove', doResize);
    window.addEventListener('touchend', stopResize);
  };

return (
  <>
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing}
      onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
      className={`absolute top-0 left-0 z-10 w-full h-full touch-none ${mode !== 'none' ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}`}
    />
    
    {textInput && (
      <div 
        className="absolute z-20 border-2 border-blue-500 bg-white/10 backdrop-blur-sm"
        style={{ 
          left: textInput.x, top: textInput.y,
          width: textInput.w, height: textInput.h,
          transformOrigin: 'top left',
          transform: `scale(${1 / (transformContext.transformState.scale || 1)})` 
        }}
      >
        <textarea
          autoFocus
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onBlur={() => { if(!isResizing.current) handleTextSubmit(); }}
          className="w-full h-full bg-transparent outline-none resize-none p-2 text-black font-bold leading-tight"
          style={{ color, fontSize: '20px' }}
          placeholder="入力開始..."
        />
        {/* 🌟 動画のような青いリサイズドット */}
        <div 
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
          className="absolute -right-2 -bottom-2 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize border-2 border-white shadow-xl z-30"
        />
        <div className="absolute -left-1 -top-1 w-2 h-2 bg-blue-500 rounded-full border border-white" />
      </div>
    )}
  </>
);
}