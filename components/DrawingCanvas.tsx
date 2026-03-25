'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Move, Trash2, Check } from 'lucide-react';

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
type TextData = { text: string; x: number; y: number; width: number; height: number; color: string; fontSize?: number };

export default function DrawingCanvas({ mode, color, penWidth, markerWidth, eraserWidth, pageIndex, pdfId = 'default-pdf' }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [textInput, setTextInput] = useState<{ x: number; y: number; w: number; h: number; fontSize: number } | null>(null);
  const [textValue, setTextValue] = useState("");

  const pathsRef = useRef<PathData[]>([]);
  const textsRef = useRef<TextData[]>([]);
  const currentPathRef = useRef<Point[]>([]);

  const textValueRef = useRef("");
  const textInputRef = useRef<{ x: number; y: number; w: number; h: number; fontSize: number } | null>(null);
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
    
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);
    
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
      const size = t.fontSize || 20;
      ctx.font = `bold ${size}px sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillStyle = t.color;
      wrapText(ctx, t.text, t.x, t.y, t.width, size * 1.2); 
    });

    ctx.restore();
  }, [mode, color, penWidth, markerWidth, eraserWidth]);

  useEffect(() => {
    const initCanvas = () => {
      const canvas = canvasRef.current;
      const parent = canvas?.parentElement;
      if (canvas && parent) {
        const dpr = window.devicePixelRatio || 1;
        const cssWidth = parent.clientWidth;
        const cssHeight = parent.clientHeight;
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;
        canvas.width = cssWidth * dpr;
        canvas.height = cssHeight * dpr;
        redraw();
      }
    };
    const timer = setTimeout(initCanvas, 300);
    window.addEventListener('resize', initCanvas);
    return () => { clearTimeout(timer); window.removeEventListener('resize', initCanvas); };
  }, [redraw]);

  const saveAnnotations = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const currentData = { paths: [...pathsRef.current], texts: [...textsRef.current] };
    await supabase.from('annotations').upsert({
      user_id: user.id, pdf_id: pdfId, page_index: pageIndex,
      data: currentData, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id, pdf_id, page_index' });
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
      textsRef.current.push({ text: val, x: pos.x, y: pos.y, width: pos.w, height: pos.h, color, fontSize: pos.fontSize });
      redraw();
      saveAnnotations();
    }
    setTextInput(null);
    setTextValue("");
  }, [color, redraw, saveAnnotations]);


  // 🌟🌟🌟 ここがズレを完璧に直す新しい計算式です 🌟🌟🌟
  const getCorrectedCoordinates = (clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Canvasの「画面上の見た目のサイズ」と「内部のCSSサイズ」の比率を割り出す
    const scaleX = rect.width / canvas.offsetWidth;
    const scaleY = rect.height / canvas.offsetHeight;
    
    return { 
      x: (clientX - rect.left) / scaleX, 
      y: (clientY - rect.top) / scaleY 
    };
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isResizing.current) return;
    if (e.touches.length >= 2) {
      if (isDrawing) { setIsDrawing(false); currentPathRef.current = []; redraw(); }
      return; 
    }
    e.stopPropagation();
    document.dispatchEvent(new Event('canvas-interact'));
    const touch = e.touches[0];
    initDraw(touch.clientX, touch.clientY);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isResizing.current) return;
    e.stopPropagation();
    document.dispatchEvent(new Event('canvas-interact'));
    initDraw(e.clientX, e.clientY);
  };

  const initDraw = (clientX: number, clientY: number) => {
    if (textInputRef.current) {
      if (textValueRef.current.trim()) {
        handleTextSubmit();
      } else {
        setTextInput(null);
        setTextValue("");
      }
    }

    const { x, y } = getCorrectedCoordinates(clientX, clientY);

    if (mode === 'text' || mode === 'none') {
      const clickedTextIndex = textsRef.current.findIndex(t => 
        x >= t.x && x <= t.x + t.width && y >= t.y && y <= t.y + (t.height || 50)
      );
      if (clickedTextIndex !== -1) {
        const t = textsRef.current[clickedTextIndex];
        textsRef.current.splice(clickedTextIndex, 1);
        redraw();
        setTextInput({ x: t.x, y: t.y, w: t.width, h: t.height || 50, fontSize: t.fontSize || 20 });
        setTextValue(t.text);
        return;
      }
    }

    if (mode === 'text') {
      setTextInput({ x, y, w: 200, h: 50, fontSize: 20 });
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
    if (e.touches.length >= 2) {
      setIsDrawing(false);
      currentPathRef.current = [];
      redraw();
      return;
    }
    e.stopPropagation();
    if (e.cancelable) e.preventDefault(); 
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

  const handleMoveStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); 
    isResizing.current = true;
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startBoxX = textInput?.x || 0;
    const startBoxY = textInput?.y || 0;

    const canvas = canvasRef.current;
    const scaleX = canvas ? (canvas.getBoundingClientRect().width / canvas.offsetWidth) : 1;
    const scaleY = canvas ? (canvas.getBoundingClientRect().height / canvas.offsetHeight) : 1;

    const doMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (moveEvent.cancelable) moveEvent.preventDefault(); 
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const clientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : (moveEvent as MouseEvent).clientY;
      setTextInput(prev => prev ? { ...prev, x: startBoxX + (clientX - startX) / scaleX, y: startBoxY + (clientY - startY) / scaleY } : prev);
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

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); 
    isResizing.current = true;
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startBoxW = textInput?.w || 200;
    const startBoxH = textInput?.h || 50;

    const canvas = canvasRef.current;
    const scaleX = canvas ? (canvas.getBoundingClientRect().width / canvas.offsetWidth) : 1;
    const scaleY = canvas ? (canvas.getBoundingClientRect().height / canvas.offsetHeight) : 1;

    const doResize = (moveEvent: MouseEvent | TouchEvent) => {
      if (moveEvent.cancelable) moveEvent.preventDefault();
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const clientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : (moveEvent as MouseEvent).clientY;
      setTextInput(prev => prev ? { 
        ...prev, w: Math.max(80, startBoxW + (clientX - startX) / scaleX), h: Math.max(40, startBoxH + (clientY - startY) / scaleY) 
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
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={finishDrawing} onMouseLeave={finishDrawing}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={finishDrawing} onTouchCancel={finishDrawing}
        className={`absolute top-0 left-0 z-10 w-full h-full touch-none ${mode !== 'none' ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}`}
      />
      
      {textInput && (
        <div 
          className="absolute z-20 border-2 border-dashed border-blue-500 bg-white/80 backdrop-blur-sm group"
          onMouseDown={(e) => e.stopPropagation()} 
          onTouchStart={(e) => e.stopPropagation()} 
          style={{ 
            left: textInput.x, top: textInput.y, width: textInput.w, height: textInput.h,
            transformOrigin: 'top left',
          }}
        >
          <div 
            onMouseDown={handleMoveStart} onTouchStart={handleMoveStart}
            className="absolute -top-7 left-0 bg-blue-500 text-white text-xs px-3 py-1.5 cursor-move rounded-t-md flex items-center gap-1 shadow-md hover:bg-blue-400 active:bg-blue-600"
          >
            <Move size={14} /> 移動
          </div>

          <textarea
            autoFocus value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            className="w-full h-full bg-transparent outline-none resize-none p-2 text-black font-bold leading-tight"
            style={{ color, fontSize: `${textInput.fontSize}px` }}
            placeholder="文字を入力..."
          />
          
          <div 
            onMouseDown={handleResizeStart} onTouchStart={handleResizeStart}
            className="absolute -right-3 -bottom-3 w-6 h-6 bg-blue-500 rounded-full cursor-nwse-resize border-2 border-white shadow-md z-30 hover:scale-125 transition-transform"
          />

          <div 
            className="absolute -bottom-14 left-0 bg-white shadow-xl border border-gray-200 rounded-lg flex items-center p-1.5 gap-1 z-50 text-gray-800"
            onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
          >
            <button
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setTextInput(p => p ? { ...p, fontSize: Math.min(100, p.fontSize + 2) } : p); }}
              onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); setTextInput(p => p ? { ...p, fontSize: Math.min(100, p.fontSize + 2) } : p); }}
              className="p-1.5 hover:bg-gray-100 rounded text-sm font-black flex items-center justify-center min-w-[32px] text-black"
            >
              A+
            </button>
            <button
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setTextInput(p => p ? { ...p, fontSize: Math.max(10, p.fontSize - 2) } : p); }}
              onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); setTextInput(p => p ? { ...p, fontSize: Math.max(10, p.fontSize - 2) } : p); }}
              className="p-1.5 hover:bg-gray-100 rounded text-sm font-black flex items-center justify-center min-w-[32px] text-black"
            >
              A-
            </button>
            <div className="w-[1px] h-5 bg-gray-300 mx-1" />
            <button
              onMouseDown={(e) => {
                e.stopPropagation(); e.preventDefault();
                setTextInput(null);
                setTextValue("");
                saveAnnotations();
                redraw();
              }}
              onTouchStart={(e) => {
                e.stopPropagation(); e.preventDefault();
                setTextInput(null);
                setTextValue("");
                saveAnnotations();
                redraw();
              }}
              className="p-1.5 hover:bg-red-50 hover:text-red-600 text-red-500 rounded flex items-center justify-center min-w-[32px] transition-colors"
            >
              <Trash2 size={16} />
            </button>
            <div className="w-[1px] h-5 bg-gray-300 mx-1" />
            <button
              onMouseDown={(e) => {
                e.stopPropagation(); e.preventDefault();
                handleTextSubmit();
              }}
              onTouchStart={(e) => {
                e.stopPropagation(); e.preventDefault();
                handleTextSubmit();
              }}
              className="p-1.5 hover:bg-green-50 hover:text-green-600 text-green-500 rounded flex items-center justify-center min-w-[32px] transition-colors"
            >
              <Check size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}