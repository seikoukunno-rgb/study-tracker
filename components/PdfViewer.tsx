// components/PdfViewer.tsx
'use client';

import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// PDF描画のための必須設定
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

type PdfViewerProps = {
  pdfUrl: string;
};

// 外部から scrollToPage を呼び出せるようにする設定
export type PdfViewerHandle = {
  scrollToPage: (pageNumber: number) => void;
};

const PdfViewer = forwardRef<PdfViewerHandle, PdfViewerProps>(({ pdfUrl }, ref) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  
  // 各ページのHTML要素を記憶する箱
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // 🌟 ここで「指定されたページまでスッとスクロールする」魔法の関数を定義
  useImperativeHandle(ref, () => ({
    scrollToPage: (pageNumber: number) => {
      const pageElement = pageRefs.current[pageNumber];
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }));

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  return (
    <div className="h-full overflow-y-auto bg-[#111111] p-8 flex flex-col items-center gap-8">
      <Document
        file={pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        className="flex flex-col gap-8"
        loading={<div className="text-white font-bold animate-pulse">PDFを読み込み中...</div>}
      >
        {numPages && Array.from(new Array(numPages), (el, index) => (
          <div 
            key={`page_${index + 1}`}
            ref={(el) => { pageRefs.current[index + 1] = el; }} // 要素を記憶させる
            className="shadow-2xl shadow-black/50 overflow-hidden rounded-lg"
          >
            {/* 🌟 scale でPDFのサイズを調整できます */}
            <Page pageNumber={index + 1} scale={1.2} />
          </div>
        ))}
      </Document>
    </div>
  );
});

PdfViewer.displayName = "PdfViewer";
export default PdfViewer;