'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useTransformContext } from "react-zoom-pan-pinch";
import { supabase } from '@/lib/supabase';
import { Move } from 'lucide-react';

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
type TextData = { text: string; x: number; y: number; width: number; height: number; color: string };

export default function DrawingCanvas({ mode, color, penWidth, markerWidth, eraserWidth, pageIndex, pdfId = 'default-pdf' }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [textInput, setTextInput] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [textValue, setTextValue] = useState("");

  const transformContext = useTransformContext();
  const pathsRef = useRef<PathData[]>([]);
  const textsRef = useRef<TextData[]>([]);
  const currentPathRef = useRef<Point[]>([]);

  const textValueRef = useRef("");
  const textInputRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const isResizing = useRef(false);

  useEffect(() => { textValueRef.current = textValue; }, [textValue]);
  useEffect(() => { textInputRef.current = textInput; }, [textInput]);

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const lines = text.split('\n');
    let currentY = y;
    lines.forEach(line => {
      let words = line.split('');
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
      wrapText(ctx, t.text, t.x, t.y, t.width, 24); 
    });
  }, [mode, color, penWidth, markerWidth, eraserWidth]);

  const saveAnnotations = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const currentData = { 
      paths: [...pathsRef.current], 
      texts: [...textsRef.current] 
    };

    const { error } = await supabase.from('annotations').upsert({
      user_id: user.id, 
      pdf_id: pdfId, 
      page_index: pageIndex,
      data: currentData,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id, pdf_id, page_index' });

    if (error) console.error("保存失敗:", error);
  }, [pdfId, pageIndex]);

  useEffect(() => {
    const loadAnnotations = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('annotations').select('data').eq('user_id', user.id).eq('pdf_id', pdfId).eq('page_index', pageIndex).maybeSingle();
      if (data?.data) {
        pathsRef.current = data.data.paths || [];
        textsRef.current = data.data.texts || [];
      }
      redraw();
    };
    loadAnnotations();
  }, [pageIndex, pdfId, redraw]);

  useEffect(() => {
    const handleClearCanvas = () => {
      pathsRef.current = [];
      textsRef.current = [];
      redraw();
      saveAnnotations();
    };
    document.addEventListener('clear-canvas', handleClearCanvas);
    return () => document.removeEventListener('clear-canvas', handleClearCanvas);
  }, [redraw, saveAnnotations]);

  const handleTextSubmit = useCallback(() => {
    const val = textValueRef.current;
    const pos = textInputRef.current;
    textValueRef.current = "";
    textInputRef.current = null;

    if (val.trim() && pos) {
      textsRef.current.push({ text: val, x: pos.x, y: pos.y, width: pos.w, height: pos.h, color });
      redraw();
      saveAnnotations();
    }
    setTextInput(null);
    setTextValue("");
  }, [color, redraw, saveAnnotations]);

  const getCorrectedCoordinates = (clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { 
      x: (clientX - rect.left) * scaleX, 
      y: (clientY - rect.top) * scaleY 
    };
  };

  // 🌟🌟🌟 修正1：タッチイベント（スマホ・タブレット用）
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isResizing.current) return;
    
    // 🌟 2本指以上で触れた場合は、描画をキャンセルしてイベントを「透過」させる（拡大・移動が発動する）
    if (e.touches.length >= 2) {
      if (isDrawing) {
        setIsDrawing(false);
        currentPathRef.current = [];
        redraw();
      }
      return; 
    }

    // 1本指の時だけ、画面を固定して描画処理に専念する
    e.stopPropagation();
    document.dispatchEvent(new Event('canvas-interact'));

    const touch = e.touches[0];
    initDraw(touch.clientX, touch.clientY);
  };

  // 🌟🌟🌟 修正2：マウスイベント（PC用）
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isResizing.current) return;
    e.stopPropagation();
    document.dispatchEvent(new Event('canvas-interact'));
    initDraw(e.clientX, e.clientY);
  };

  // 共通の描画スタートロジック
  const initDraw = (clientX: number, clientY: number) => {
    const { x, y } = getCorrectedCoordinates(clientX, clientY);

    if (mode === 'text' || mode === 'none') {
      const clickedTextIndex = textsRef.current.findIndex(t => 
        x >= t.x && x <= t.x + t.width && y >= t.y && y <= t.y + (t.height || 50)
      );
      if (clickedTextIndex !== -1) {
        if (textInputRef.current && textValueRef.current.trim()) handleTextSubmit();
        const t = textsRef.current[clickedTextIndex];
        textsRef.current.splice(clickedTextIndex, 1);
        redraw();
        setTextInput({ x: t.x, y: t.y, w: t.width, h: t.height || 50 });
        setTextValue(t.text);
        return;
      }
    }

    if (mode === 'text') {
      if (textInputRef.current && textValueRef.current.trim()) handleTextSubmit();
      setTextInput({ x, y, w: 200, h: 50 });
      setTextValue("");
      return;
    }

    if (mode === 'none') return;
    setIsDrawing(true);
    currentPathRef.current = [{ x, y }];
    redraw();
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || mode === 'none' || mode === 'text') return;
    
    // 描画中に2本指になったら、描画をやめて移動・拡大に切り替える
    if (e.touches.length >= 2) {
      setIsDrawing(false);
      currentPathRef.current = [];
      redraw();
      return;
    }

    e.stopPropagation();
    if (e.cancelable) e.preventDefault(); // 画面がスクロールするのを防ぐ
    
    const touch = e.touches[0];
    const { x, y } = getCorrectedCoordinates(touch.clientX, touch.clientY);
    currentPathRef.current.push({ x, y });
    redraw();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || mode === 'none' || mode === 'text') return;
    e.stopPropagation();
    const { x, y } = getCorrectedCoordinates(e.clientX, e.clientY);
    currentPathRef.current.push({ x, y });
    redraw();
  };

  const finishDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPathRef.current.length > 0) {
      const width = mode === 'eraser' ? eraserWidth : (mode === 'marker' ? markerWidth : penWidth);
      pathsRef.current.push({ mode: mode as any, color, width, points: [...currentPathRef.current] });
      currentPathRef.current = [];
      saveAnnotations();
    }
  };

  // 🌟 テキストの「移動」
  const handleMoveStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); // 🌟 ここが重要！テキストを掴んだらPDFの画面移動を完全にブロックする
    isResizing.current = true;
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startBoxX = textInput?.x || 0;
    const startBoxY = textInput?.y || 0;
    const scale = transformContext.transformState.scale || 1;

    const doMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (moveEvent.cancelable) moveEvent.preventDefault(); // スワイプスクロールを防ぐ
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const clientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : (moveEvent as MouseEvent).clientY;
      setTextInput(prev => prev ? { ...prev, x: startBoxX + (clientX - startX) / scale, y: startBoxY + (clientY - startY) / scale } : prev);
    };

    const stopMove = () => {
      window.removeEventListener('mousemove', doMove);
      window.removeEventListener('mouseup', stopMove);
      window.removeEventListener('touchmove', doMove);
      window.removeEventListener('touchend', stopMove);
      setTimeout(() => { isResizing.current = false; }, 100);
    };

    window.addEventListener('mousemove', doMove, { passive: false });
    window.addEventListener('mouseup', stopMove);
    window.addEventListener('touchmove', doMove, { passive: false });
    window.addEventListener('touchend', stopMove);
  };

  // 🌟 テキストの「サイズ変更」
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); // 🌟 画面移動をブロック
    isResizing.current = true;
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startBoxW = textInput?.w || 200;
    const startBoxH = textInput?.h || 50;
    const scale = transformContext.transformState.scale || 1;

    const doResize = (moveEvent: MouseEvent | TouchEvent) => {
      if (moveEvent.cancelable) moveEvent.preventDefault();
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const clientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : (moveEvent as MouseEvent).clientY;
      setTextInput(prev => prev ? { 
        ...prev, 
        w: Math.max(100, startBoxW + (clientX - startX) / scale), 
        h: Math.max(40, startBoxH + (clientY - startY) / scale) 
      } : prev);
    };

    const stopResize = () => {
      window.removeEventListener('mousemove', doResize);
      window.removeEventListener('mouseup', stopResize);
      window.removeEventListener('touchmove', doResize);
      window.removeEventListener('touchend', stopResize);
      setTimeout(() => { isResizing.current = false; }, 100);
    };

    window.addEventListener('mousemove', doResize, { passive: false });
    window.addEventListener('mouseup', stopResize);
    window.addEventListener('touchmove', doResize, { passive: false });
    window.addEventListener('touchend', stopResize);
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        // 🌟 PointerEvent から MouseEvent / TouchEvent の個別処理に完全分離
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={finishDrawing} onMouseLeave={finishDrawing}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={finishDrawing} onTouchCancel={finishDrawing}
        className={`absolute top-0 left-0 z-10 w-full h-full touch-none ${mode !== 'none' ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}`}
      />
      
      {textInput && (
        <div 
          className="absolute z-20 border-2 border-dashed border-blue-500 bg-white/80 backdrop-blur-sm group"
          // 🌟 テキストボックス内を触った時は、裏側のPDFがスワイプされないようにする
          onMouseDown={(e) => e.stopPropagation()} 
          onTouchStart={(e) => e.stopPropagation()} 
          style={{ 
            left: textInput.x, top: textInput.y, width: textInput.w, height: textInput.h,
            transformOrigin: 'top left',
          }}
        >
          {/* 移動ハンドル */}
          <div 
            onMouseDown={handleMoveStart} onTouchStart={handleMoveStart}
            className="absolute -top-7 left-0 bg-blue-500 text-white text-xs px-3 py-1.5 cursor-move rounded-t-md flex items-center gap-1 shadow-md hover:bg-blue-400 active:bg-blue-600"
          >
            <Move size={14} /> 移動
          </div>

          <textarea
            autoFocus value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onBlur={() => { if (!isResizing.current) handleTextSubmit(); }}
            className="w-full h-full bg-transparent outline-none resize-none p-2 text-black font-bold leading-tight"
            style={{ color, fontSize: '20px' }}
            placeholder="文字を入力..."
          />
          
          {/* リサイズハンドル */}
          <div 
            onMouseDown={handleResizeStart} onTouchStart={handleResizeStart}
            className="absolute -right-3 -bottom-3 w-6 h-6 bg-blue-500 rounded-full cursor-nwse-resize border-2 border-white shadow-md z-30 hover:scale-125 transition-transform"
          />
        </div>
      )}
    </>
  );
}