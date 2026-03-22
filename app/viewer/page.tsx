// app/viewer/page.tsx
'use client';

import { useRef, useState } from 'react';
import PdfViewer, { PdfViewerHandle } from '@/components/PdfViewer';
import PdfSidebar from '@/components/PdfSidebar';

export default function ViewerPage() {
  const pdfViewerRef = useRef<PdfViewerHandle>(null);

  // 🌟 PDF操作の状態を一括管理
  const [drawingMode, setDrawingMode] = useState<'none' | 'pen' | 'marker' | 'eraser' | 'text'>('none');
  const [drawingColor, setDrawingColor] = useState('#ef4444');
  
  // 🌟 太さの状態を追加
  const [penWidth, setPenWidth] = useState(3);
  const [markerWidth, setMarkerWidth] = useState(18);
  const [eraserWidth, setEraserWidth] = useState(30);

  const handleNoteClick = (pageNumber: number) => {
    pdfViewerRef.current?.scrollToPage(pageNumber);
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      {/* 左側：PDF表示エリア */}
      <div className="flex-1 relative">
        <PdfViewer 
          ref={pdfViewerRef} 
          pdfUrl="/sample.pdf"
          // 🌟 最新の状態を渡す（これでテキストモードも太さ変更も反映される）
          drawingMode={drawingMode}
          drawingColor={drawingColor}
          penWidth={penWidth}
          markerWidth={markerWidth}
          eraserWidth={eraserWidth}
        />
      </div>

      {/* 右側：タイマー＆メモ ＋ ツールバーのサイドバー */}
      <PdfSidebar 
        onNoteClick={handleNoteClick}
        // 🌟 サイドバーのボタンで状態を変えられるように関数を渡す
        drawingMode={drawingMode}
        setDrawingMode={setDrawingMode}
        drawingColor={drawingColor}
        setDrawingColor={setDrawingColor}
        // 🌟 太さを変えるための関数も渡す
        penWidth={penWidth}
        setPenWidth={setPenWidth}
        markerWidth={markerWidth}
        setMarkerWidth={setMarkerWidth}
      />
    </div>
  );
}