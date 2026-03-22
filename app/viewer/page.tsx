'use client';

import { useRef, useState } from 'react';
import PdfViewer, { PdfViewerHandle } from '@/components/PdfViewer';
import PdfSidebar from '@/components/PdfSidebar';
import { PenTool, Highlighter, Eraser, Type, Hand } from 'lucide-react'; // 🌟 アイコンを追加

export default function ViewerPage() {
  const pdfViewerRef = useRef<PdfViewerHandle>(null);

  const [drawingMode, setDrawingMode] = useState<'none' | 'pen' | 'marker' | 'eraser' | 'text'>('none');
  const [drawingColor, setDrawingColor] = useState('#ef4444');
  const [penWidth, setPenWidth] = useState(3);
  const [markerWidth, setMarkerWidth] = useState(18);
  const [eraserWidth, setEraserWidth] = useState(30);

  return (
    // 🌟 h-screen を h-[100dvh] に変更（スマホの白い余白を防ぐ魔法）
    <div className="flex h-[100dvh] bg-[#0a0a0a] overflow-hidden relative w-full">
      
      {/* 🌟 スマホ完全対応：画面上部に固定配置されるツールバー（絶対に消えない） */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/90 backdrop-blur-xl px-4 py-2 rounded-full flex items-center gap-2 border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.8)] w-max max-w-[95%] overflow-x-auto no-scrollbar">
        
        {/* 移動（スクロール）モード */}
        <button onClick={() => setDrawingMode('none')} className={`p-2 rounded-full transition-colors ${drawingMode === 'none' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/10'}`}>
          <Hand className="w-5 h-5" />
        </button>

        <div className="w-[1px] h-6 bg-white/20 mx-1" />

        {/* ツール群（ここにTボタンが確実に表示されます） */}
        <button onClick={() => setDrawingMode('pen')} className={`p-2 rounded-full transition-colors ${drawingMode === 'pen' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/10'}`}>
          <PenTool className="w-5 h-5" />
        </button>
        <button onClick={() => setDrawingMode('marker')} className={`p-2 rounded-full transition-colors ${drawingMode === 'marker' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/10'}`}>
          <Highlighter className="w-5 h-5" />
        </button>
        <button onClick={() => setDrawingMode('eraser')} className={`p-2 rounded-full transition-colors ${drawingMode === 'eraser' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/10'}`}>
          <Eraser className="w-5 h-5" />
        </button>
        <button onClick={() => setDrawingMode('text')} className={`p-2 rounded-full transition-colors ${drawingMode === 'text' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/10'}`}>
          <Type className="w-5 h-5" />
        </button>

        <div className="w-[1px] h-6 bg-white/20 mx-1" />

        {/* 色選択 */}
        <div className="flex gap-2 items-center">
          {['#ef4444', '#3b82f6', '#eab308'].map((c) => (
            <button 
              key={c}
              onClick={() => setDrawingColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${drawingColor === c ? 'border-white scale-125' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* 左側：PDF表示エリア */}
      <div className="flex-1 relative w-full h-full">
        <PdfViewer 
          ref={pdfViewerRef} 
          pdfUrl="/sample.pdf"
          drawingMode={drawingMode}
          drawingColor={drawingColor}
          penWidth={penWidth}
          markerWidth={markerWidth}
          eraserWidth={eraserWidth}
        />
      </div>

      {/* 🌟 PCの時だけサイドバーを表示（スマホでは非表示にしてレイアウト崩れを防ぐ） */}
      <div className="hidden lg:block">
        <PdfSidebar 
          onNoteClick={(pageNumber) => pdfViewerRef.current?.scrollToPage(pageNumber)}
          drawingMode={drawingMode}
          setDrawingMode={setDrawingMode}
          drawingColor={drawingColor}
          setDrawingColor={setDrawingColor}
          penWidth={penWidth}
          setPenWidth={setPenWidth}
          markerWidth={markerWidth}
          setMarkerWidth={setMarkerWidth}
        />
      </div>
    </div>
  );
}