// app/viewer/page.tsx
'use client';

import { useRef, useState } from 'react';
import PdfViewer, { PdfViewerHandle } from '@/components/PdfViewer';
import PdfToolbar from '@/components/PdfToolbar'; // 🌟 新しいツールバーに変更

export default function ViewerPage() {
  const pdfViewerRef = useRef<PdfViewerHandle>(null);

  const [drawingMode, setDrawingMode] = useState<'none' | 'pen' | 'marker' | 'eraser' | 'text'>('none');
  const [drawingColor, setDrawingColor] = useState('#ef4444');
  const [penWidth, setPenWidth] = useState(3);
  const [markerWidth, setMarkerWidth] = useState(18);
  const [eraserWidth, setEraserWidth] = useState(30);

  return (
    <div className="flex h-[100dvh] w-full bg-[#0a0a0a] overflow-hidden relative text-slate-100">
      
      {/* 🌟 上部にEdge風ツールバーを配置 */}
      <PdfToolbar 
        mode={drawingMode} setMode={setDrawingMode}
        color={drawingColor} setColor={setDrawingColor}
        penWidth={penWidth} setPenWidth={setPenWidth}
        markerWidth={markerWidth} setMarkerWidth={setMarkerWidth}
        eraserWidth={eraserWidth} setEraserWidth={setEraserWidth}
      />

      <div className="flex-1 relative w-full h-full">
        <PdfViewer 
          ref={pdfViewerRef} 
          pdfUrl="/sample.pdf" 
          pdfId="viewer-static-pdf"
          drawingMode={drawingMode}
          drawingColor={drawingColor}
          penWidth={penWidth}
          markerWidth={markerWidth}
          eraserWidth={eraserWidth}
        />
      </div>
      
      {/* 🌟 タイマー専用になった PdfSidebar はここからは削除しました */}
    </div>
  );
}