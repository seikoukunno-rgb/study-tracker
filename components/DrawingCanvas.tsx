'use client';

import { useRef, useState, useEffect } from 'react';

type DrawingCanvasProps = {
  // 🌟 'text' モードを追加
  mode: 'none' | 'pen' | 'marker' | 'eraser' | 'text';
  color: string;
  pageIndex: number;
};

export default function DrawingCanvas({ mode, color, pageIndex }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // 🌟 テキスト入力用の状態を追加
  const [textInput, setTextInput] = useState<{ x: number; y: number } | null>(null);
  const [textValue, setTextValue] = useState("");

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

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // 🌟 テキストモードの場合：クリック位置にテキストボックスを出す
    if (mode === 'text') {
      setTextInput({ x, y });
      setTextValue("");
      return;
    }

    setIsDrawing(true);

    // モード別の設定（マーカーは透ける＆乗算で下の文字を綺麗に見せる）
    ctx.globalCompositeOperation = mode === 'eraser' ? 'destination-out' : (mode === 'marker' ? 'multiply' : 'source-over');
    ctx.lineWidth = mode === 'eraser' ? 30 : (mode === 'marker' ? 18 : 3); 
    ctx.globalAlpha = mode === 'marker' ? 0.4 : 1.0; 
    ctx.strokeStyle = mode === 'eraser' ? 'rgba(0,0,0,1)' : color;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || mode === 'none' || mode === 'text') return;
    if ('touches' in e && e.cancelable) e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();

    // 🌟【最重要修正】これを追加しないと、線が何百回も重なって真っ黒になります！
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stopDrawing = () => setIsDrawing(false);

  // 🌟 入力したテキストをキャンバスに焼き付ける関数
  const handleTextSubmit = () => {
    if (textValue.trim() && textInput) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        ctx.font = 'bold 20px sans-serif'; // 文字のサイズと太さ
        ctx.fillStyle = color; // ペンの色と同じにする
        ctx.fillText(textValue, textInput.x, textInput.y + 6); // +6は高さの微調整
      }
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
          // 🌟 mode === 'none' の時はキャンバスがタッチを無視し、下のPDFがスクロールできるようになる
          mode !== 'none' ? 'cursor-crosshair pointer-events-auto touch-none' : 'pointer-events-none'
        }`}
      />

      {/* 🌟 テキスト入力用のふせんUI（絶対配置でクリック位置に重なる） */}
      {textInput && (
        <input
          type="text"
          autoFocus
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onBlur={handleTextSubmit} // 他の場所をクリックしたら確定
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleTextSubmit(); // Enterキーで確定
          }}
          className="absolute z-20 bg-white/90 border-2 border-indigo-500 rounded px-2 py-1 outline-none shadow-xl"
          style={{
            left: textInput.x,
            top: textInput.y - 14,
            color: color,
            fontSize: '20px',
            fontWeight: 'bold',
          }}
          placeholder="文字を入力してEnter"
        />
      )}
    </>
  );
}