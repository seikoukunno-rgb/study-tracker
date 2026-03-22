'use client';

import { useRef, useState } from 'react';
import PdfViewer, { PdfViewerHandle } from '@/components/PdfViewer';
import PdfSidebar from '@/components/PdfSidebar';

export default function ViewerPage() {
  // 🌟 PDFビューアーを操作するためのRef（ページジャンプ用）
  const pdfViewerRef = useRef<PdfViewerHandle>(null);

  // 🌟 お絵描き・ツールバーの状態をこの「司令塔」で一括管理
  const [drawingMode, setDrawingMode] = useState<'none' | 'pen' | 'marker' | 'eraser' | 'text'>('none');
  const [drawingColor, setDrawingColor] = useState('#ef4444');
  
  // 各ツールの太さ状態
  const [penWidth, setPenWidth] = useState(3);
  const [markerWidth, setMarkerWidth] = useState(18);
  const [eraserWidth, setEraserWidth] = useState(30);

  // サイドバーのメモをクリックした時にPDFを指定ページへスクロールさせる
  const handleNoteClick = (pageNumber: number) => {
    pdfViewerRef.current?.scrollToPage(pageNumber);
  };

  return (
    // 🌟 h-[100dvh] でスマホのブラウザ特有の「下の余白バグ」を防止
    <div className="flex h-[100dvh] w-full bg-[#0a0a0a] overflow-hidden relative">
      

      {/* 🌟 これを追加して保存してください！ */}
      <h1 className="absolute top-10 left-10 z-[999] text-5xl text-red-500 font-bold bg-white p-4">
        画面更新テスト！！！
      </h1>
      {/* 左側：メインのPDF表示エリア */}
      <div className="flex-1 relative w-full h-full">
        <PdfViewer 
          ref={pdfViewerRef} 
          pdfUrl="/sample.pdf" // 👈 表示したいPDFのパスに変更してください
          drawingMode={drawingMode}
          drawingColor={drawingColor}
          penWidth={penWidth}
          markerWidth={markerWidth}
          eraserWidth={eraserWidth}
        />
      </div>

      {/* 右側：サイドバー 
        🌟 「hidden lg:block」を外しました。
        🌟 自由に動くツールバー（ポップアップ）は PdfSidebar の中に含まれているため、
           コンポーネント自体はスマホでも常に読み込む必要があります。
           （サイドバー本体の隠し制御は PdfSidebar.tsx 側のCSSで行います）
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
      />
    </div>
  );
}