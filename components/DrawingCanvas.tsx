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
type TextData = { text: string; x: number; y: number; color: string };

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

  // 🌟 罠1を解決：テキストの「打ち消し合い（Race Condition）」を防ぐための絶対記憶領域
  const textValueRef = useRef("");
  const textInputRef = useRef<{ x: number; y: number } | null>(null);

  // 入力中の文字と場所を常に最新化しておく
  useEffect(() => { textValueRef.current = textValue; }, [textValue]);
  useEffect(() => { textInputRef.current = textInput; }, [textInput]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    pathsRef.current.forEach((path) => {
      if (path.points.length === 0) return;
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
      ctx.textBaseline = 'top'; // 🌟 罠3を解決：文字の縦ズレをなくし、ピッタリの位置に焼き付ける
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    });
  }, [mode, color, penWidth, markerWidth, eraserWidth]);

  useEffect(() => {
    const loadAnnotations = async () => {
      setStatusMsg("読み込み中...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatusMsg(""); return; }

      const { data, error } = await supabase
        .from('annotations')
        .select('data')
        .eq('user_id', user.id)
        .eq('pdf_id', pdfId)
        .eq('page_index', pageIndex)
        .maybeSingle();

      if (error) { setStatusMsg("❌ 読込エラー: " + error.message); return; }

      if (data && data.data) {
        pathsRef.current = data.data.paths || [];
        textsRef.current = data.data.texts || [];
        setStatusMsg("✅ データ復元完了");
      } else {
        pathsRef.current = [];
        textsRef.current = [];
        setStatusMsg("");
      }
      redraw();
      setTimeout(() => setStatusMsg(""), 3000);
    };
    loadAnnotations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, pdfId]); 

  const saveAnnotations = async () => {
    setStatusMsg("💾 保存中...");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setStatusMsg("🚨 未ログイン"); return; }

    const annotationData = { paths: pathsRef.current, texts: textsRef.current };
    const { error } = await supabase
      .from('annotations')
      .upsert({
        user_id: user.id,
        pdf_id: pdfId,
        page_index: pageIndex,
        data: annotationData,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id, pdf_id, page_index' });

    if (error) {
      setStatusMsg("❌ 保存失敗: " + error.message);
    } else {
      setStatusMsg("🚀 保存成功！");
      setTimeout(() => setStatusMsg(""), 3000);
    }
  };

  // 🌟 テキストを確定させる最強の関数
  const handleTextSubmit = useCallback(() => {
    const val = textValueRef.current;
    const pos = textInputRef.current;

    // 二重保存を防ぐため、確定したら即座に記憶領域を空にする
    textValueRef.current = "";
    textInputRef.current = null;

    if (val.trim() && pos) {
      textsRef.current.push({ text: val, x: pos.x, y: pos.y, color });
      redraw();
      saveAnnotations();
    }

    setTextInput(null);
    setTextValue("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // 🌟 罠1を解決：もし既に開いているテキストボックスに文字が入っていたら、消さずに強制保存する！
      if (textInputRef.current && textValueRef.current.trim()) {
        handleTextSubmit();
      }
      // 新しいテキストボックスを開く
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

  return (
    <>
      {statusMsg && (
        <div className="absolute top-2 left-2 z-[999] bg-black/80 text-white px-3 py-1 rounded-md text-sm font-bold pointer-events-none shadow-lg border border-white/20">
          {statusMsg}
        </div>
      )}

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
        onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
        onTouchCancel={cancelDrawing} 
        className={`absolute top-0 left-0 z-10 w-full h-full touch-none ${
          mode !== 'none' ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'
        }`}
      />
      {textInput && (
        <input
          type="text" autoFocus value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onBlur={handleTextSubmit} 
          onKeyDown={(e) => { 
            if (e.key === 'Enter') {
              // 🌟 罠2を解決：日本語入力の「変換確定」のエンターか、「送信」のエンターかを見分ける！
              if (e.nativeEvent.isComposing) return;
              e.currentTarget.blur();
            }
          }}
          onMouseDown={stopEvent} onTouchStart={stopEvent}
          className="absolute z-20 bg-white border-2 border-indigo-600 rounded px-2 py-0 outline-none shadow-2xl text-black"
          style={{ 
            left: textInput.x, top: textInput.y, color, fontSize: '20px', fontWeight: 'bold', // 🌟 位置のズレを修正
            transformOrigin: 'top left',
            transform: `scale(${1 / (transformContext.transformState.scale || 1)})` 
          }}
          placeholder="文字を入力..."
        />
      )}
    </>
  );
}