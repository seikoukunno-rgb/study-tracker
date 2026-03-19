// components/PdfViewer.tsx
'use client';

import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import DrawingCanvas from './DrawingCanvas'; // 🌟 キャンバスを呼び出し

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

type PdfViewerProps = {
  pdfUrl: string;
  isDrawingMode?: boolean; // 🌟 ペンモードを受け取る
};

export type PdfViewerHandle = {
  scrollToPage: (pageNumber: number) => void;
};

const PdfViewer = forwardRef<PdfViewerHandle, PdfViewerProps>(({ pdfUrl, isDrawingMode = false }, ref) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // 親から指定されたページにスッと移動する機能
  useImperativeHandle(ref, () => ({
    scrollToPage: (pageNumber: number) => {
      const pageRefsCurrent = pageRefs.current;
      if (pageRefsCurrent && pageRefsCurrent[pageNumber]) {
        pageRefsCurrent[pageNumber]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }));

  return (
    // 🌟 余白（p-8など）を完全削除し、背景色を全体のダークトーン(#0a0a0a)に統一！
    <div className="h-full w-full overflow-y-auto bg-[#0a0a0a] flex flex-col items-center">
      <Document
        file={pdfUrl}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        className="flex flex-col items-center py-8 gap-8" // 上下の呼吸スペースだけ確保
        loading={<div className="text-indigo-400 font-black animate-pulse mt-20">LOADING PDF...</div>}
        error={<div className="text-rose-500 font-bold mt-20">Error Loading PDF</div>}
      >
        {numPages && Array.from(new Array(numPages), (_, index) => (
          <div 
            key={`page_${index + 1}`}
            ref={(el) => { pageRefs.current[index + 1] = el; }} 
            className="relative shadow-2xl shadow-black overflow-hidden border border-white/5 bg-white"
          >
            <Page 
              pageNumber={index + 1} 
              scale={1.2} 
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
            {/* 🌟 ここに透明な画用紙（キャンバス）を被せる！ */}
            <DrawingCanvas isDrawingMode={isDrawingMode} pageIndex={index + 1} />
          </div>
        ))}
      </Document>
    </div>
  );
});

PdfViewer.displayName = "PdfViewer";
export default PdfViewer;