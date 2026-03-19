// components/PdfViewer.tsx
'use client';

import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import DrawingCanvas from './DrawingCanvas';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

type PdfViewerProps = {
  pdfUrl: string;
  isDrawingMode?: boolean;
};

export type PdfViewerHandle = {
  scrollToPage: (pageNumber: number) => void;
};

const PdfViewer = forwardRef<PdfViewerHandle, PdfViewerProps>(({ pdfUrl, isDrawingMode = false }, ref) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  // 🌟 追加：エラーの正体を保存するステート
  const [loadError, setLoadError] = useState<Error | null>(null);
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
    <div className="h-full w-full overflow-auto bg-[#0a0a0a] flex flex-col items-center">
      <Document
        // 文字列ではなく、オブジェクト形式でURLを渡す
        file={{ url: pdfUrl }} 
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        // 🌟 追加：エラーが起きたらここでキャッチ！
        onLoadError={(error) => setLoadError(error)}
        className="flex flex-col items-center py-8 gap-8 w-full"
        loading={<div className="text-indigo-400 font-black animate-pulse mt-20">LOADING PDF...</div>}
        // 🌟 修正：TypeScriptに怒られない形に変更
        error={
          <div className="mt-20 bg-rose-500/10 border border-rose-500/30 p-8 rounded-2xl max-w-lg text-center shadow-xl mx-4">
            <h3 className="text-rose-500 font-black text-xl mb-3">🚨 PDF読み込みエラー</h3>
            <p className="text-rose-400 text-sm font-mono break-all">
              {loadError ? loadError.message : "詳細不明のエラー"}
            </p>
          </div>
        }
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
            <DrawingCanvas isDrawingMode={isDrawingMode} pageIndex={index + 1} />
          </div>
        ))}
      </Document>
    </div>
  );
});

PdfViewer.displayName = "PdfViewer";
export default PdfViewer;