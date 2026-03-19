// components/PdfViewer.tsx
'use client';

import { useState, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
// 🌟 追加：ピンチイン・ピンチアウトを可能にする最強ライブラリ
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import DrawingCanvas from './DrawingCanvas';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

const pdfOptions = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@4.4.168/cmaps/`,
  cMapPacked: true,
};

type PdfViewerProps = {
  pdfUrl: string;
  isDrawingMode?: boolean;
};

export type PdfViewerHandle = {
  scrollToPage: (pageNumber: number) => void;
};

const PdfViewer = forwardRef<PdfViewerHandle, PdfViewerProps>(({ pdfUrl, isDrawingMode = false }, ref) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const file = useMemo(() => ({ url: pdfUrl }), [pdfUrl]);

  useImperativeHandle(ref, () => ({
    scrollToPage: (pageNumber: number) => {
      const pageRefsCurrent = pageRefs.current;
      if (pageRefsCurrent && pageRefsCurrent[pageNumber]) {
        // スムーズなスクロール移動
        pageRefsCurrent[pageNumber]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }));

  return (
    <div className="h-full w-full bg-[#0a0a0a] relative no-scrollbar">
      {/* 🌟 TransformWrapperでPDF全体を包み込む */}
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={4}
        // 🌟 超重要：書き込みモードの時は画面が動かないように「ズームと移動」をロックする！
        disabled={isDrawingMode}
        wheel={{ step: 0.1 }} // PCのマウスホイールでもズーム可能
        pinch={{ step: 5 }}   // スマホのピンチ操作の感度
      >
        <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full flex flex-col items-center">
          
          <Document
            file={file}
            options={pdfOptions}
            onLoadSuccess={({ numPages }) => { setNumPages(numPages); setLoadError(null); }}
            onLoadError={(error) => { console.error("PDF Error:", error); setLoadError(error.message); }}
            className="flex flex-col items-center py-10 gap-10 w-full"
            loading={
              <div className="flex flex-col items-center justify-center mt-32 absolute top-0">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <div className="text-indigo-400 font-black tracking-widest animate-pulse">LOADING...</div>
              </div>
            }
          >
            {loadError && (
              <div className="mt-20 bg-rose-500/10 border border-rose-500/30 p-8 rounded-2xl max-w-lg text-center mx-4 z-50 relative">
                <h3 className="text-rose-500 font-black text-xl mb-3">🚨 読み込みエラー</h3>
                <p className="text-rose-400 text-xs font-mono break-all">{loadError}</p>
              </div>
            )}

            {numPages && Array.from(new Array(numPages), (_, index) => (
              <div 
                key={`page_${index + 1}`}
                ref={(el) => { pageRefs.current[index + 1] = el; }} 
                // ページ間の隙間と影の設定
                className="relative shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden border border-white/5 bg-white mb-8"
              >
                <Page 
                  pageNumber={index + 1} 
                  // 基準サイズ（ズームはTransformWrapperが担当するため、ここでは固定でOK）
                  scale={1.2} 
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  loading=""
                />
                {/* 🌟 透明な画用紙（書き込みモード時のみ反応） */}
                <DrawingCanvas isDrawingMode={isDrawingMode} pageIndex={index + 1} />
              </div>
            ))}
          </Document>

        </TransformComponent>
      </TransformWrapper>
    </div>
  );
});

PdfViewer.displayName = "PdfViewer";
export default PdfViewer;