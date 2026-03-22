'use client';

import { useRef, useState } from 'react';
import PdfViewer, { PdfViewerHandle } from '@/components/PdfViewer';
import PdfSidebar from '@/components/PdfSidebar';

export default function ViewerPage() {
  // 🌟 PDFビューアーを操作するためのRef
  const pdfViewerRef = useRef<PdfViewerHandle>(null);

  // 🌟 お絵描き・ツールバーの状態を一括管理
  // 型定義に 'text' を確実に追加しました
  const [drawingMode, setDrawingMode] = useState<'none' | 'pen' | 'marker' | 'eraser' | 'text'>('none');
  const [drawingColor, setDrawingColor] = useState('#ef4444');
  
  // 各ツールの太さ状態
  const [penWidth, setPenWidth] = useState(3);
  const [markerWidth, setMarkerWidth] = useState(18);
  const [eraserWidth, setEraserWidth] = useState(30);

  // サイドバーのメモをクリックした時にPDFを指定ページへジャンプ
  const handleNoteClick = (pageNumber: number) => {
    pdfViewerRef.current?.scrollToPage(pageNumber);
  };

  return (
    <div className="flex h-[100dvh] w-full bg-[#0a0a0a] overflow-hidden relative text-slate-100">
      
      {/* 左側：メインのPDF表示エリア */}
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

      {/* 右側：サイドバーとツールバー 
          🌟 PdfSidebarに 'text' モードや消しゴムの太さを渡します
      */}
      <PdfSidebar 
        onNoteClick={handleNoteClick}
        drawingMode={drawingMode}
        setDrawingMode={setDrawingMode}
        drawingColor={drawingColor}
        setDrawingColor={setDrawingColor}
        penWidth={penWidth}
        setPenWidth={setPenWidth}
        markerWidth={markerWidth}
        setMarkerWidth={setMarkerWidth}
        eraserWidth={eraserWidth}
        setEraserWidth={setEraserWidth}
      />
    </div>
  );
}