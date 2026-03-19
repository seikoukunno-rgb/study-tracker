// components/PdfViewer.tsx
'use client';

import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// CSSの読み込み
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// 🌟 【最終解決策】ライブラリ自身が持つバージョン (pdfjs.version) をURLに埋め込む
// これで、APIが3.11.174ならWorkerも確実に3.11.174を取りに行きます
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

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
      const pageRefsCurrent = pageRefs.current;
      if (pageRefsCurrent && pageRefsCurrent[pageNumber]) {
        pageRefsCurrent[pageNumber]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }));

  return (
    <div className="h-full w-full overflow-y-auto bg-[#111111] p-4 md:p-8 flex flex-col items-center gap-8">
      <Document
        file={pdfUrl}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        className="flex flex-col gap-8"
        loading={<div className="text-indigo-400 font-black animate-pulse">VERIFYING VERSION...</div>}
        error={<div className="text-rose-500 font-bold p-10 bg-rose-500/10 rounded-2xl border border-rose-500/20">PDF Version Mismatch: Please Refresh</div>}
      >
        {numPages && Array.from(new Array(numPages), (_, index) => (
          <div 
            key={`page_${index + 1}`}
            ref={(el) => { pageRefs.current[index + 1] = el; }} 
            className="shadow-2xl shadow-black/80 overflow-hidden rounded-xl border border-white/5"
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