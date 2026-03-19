// app/viewer/page.tsx
'use client';

import { useRef } from 'react';
import PdfViewer, { PdfViewerHandle } from '@/components/PdfViewer';
import PdfSidebar from '@/components/PdfSidebar';

export default function ViewerPage() {
  // 🌟 PDFビューアーを操作するためのリモコン（Ref）
  const pdfViewerRef = useRef<PdfViewerHandle>(null);

  // 🌟 サイドバーでメモがクリックされた時、PDFに「〇ページに飛べ」と命令する
  const handleNoteClick = (pageNumber: number) => {
    pdfViewerRef.current?.scrollToPage(pageNumber);
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      {/* 左側：PDF表示エリア */}
      <div className="flex-1 relative">
        <PdfViewer 
          ref={pdfViewerRef} 
          pdfUrl="/sample.pdf" // ※ここに表示したいPDFのパスを入れます
        />
      </div>

      {/* 右側：タイマー＆メモのサイドバー */}
      <PdfSidebar onNoteClick={handleNoteClick} />
    </div>
  );
}