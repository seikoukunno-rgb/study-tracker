// components/PdfViewer.tsx
'use client';

import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// CSSの読み込み
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// 🌟 【修正】バージョンを 3.11.174 に完全固定します
// エラーが出ていた「APIのバージョン」にWorkerを強制的に合わせる魔法のコードです
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

type PdfViewerProps = {
  pdfUrl: string;
};

export type PdfViewerHandle = {
  scrollToPage: (pageNumber: number) => void;
};

const PdfViewer = forwardRef<PdfViewerHandle, PdfViewerProps>(({ pdfUrl }, ref) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

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
    <div className="h-full w-full overflow-y-auto bg-[#111111] p-4 md:p-8 flex flex-col items-center gap-8">
      <Document
        file={pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        className="flex flex-col gap-8"
        loading={
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-white font-black tracking-widest animate-pulse">PDF LOADING...</p>
          </div>
        }
        error={<div className="text-rose-500 font-bold">PDFを表示できませんでした</div>}
      >
        {numPages && Array.from(new Array(numPages), (el, index) => (
          <div 
            key={`page_${index + 1}`}
            ref={(el) => { pageRefs.current[index + 1] = el; }} 
            className="shadow-2xl shadow-black/80 overflow-hidden rounded-xl"
          >
            <Page 
              pageNumber={index + 1} 
              scale={1.2} 
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </div>
        ))}
      </Document>
    </div>
  );
});

PdfViewer.displayName = "PdfViewer";
export default PdfViewer;