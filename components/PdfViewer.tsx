// components/PdfViewer.tsx
'use client';

import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import DrawingCanvas from './DrawingCanvas';

// 🌟 Workerのバージョン固定
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

// 🌟 追加：日本のPDF（簿記など）を正しく表示するための「フォント翻訳辞書（CMap）」の設定
const pdfOptions = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@3.11.174/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/`,
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

  useImperativeHandle(ref, () => ({
    scrollToPage: (pageNumber: number) => {
      const pageRefsCurrent = pageRefs.current;
      if (pageRefsCurrent && pageRefsCurrent[pageNumber]) {
        pageRefsCurrent[pageNumber]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }));

  return (
    <div className="h-full w-full overflow-y-auto bg-[#0a0a0a] flex flex-col items-center no-scrollbar relative">
      <Document
        // 🌟 修正ポイント：オブジェクトではなく「文字列」を直接渡す！
        // これでタイマーが1秒ごとに動いても「同じPDFだね」と認識して再読み込みを防ぎます
        file={pdfUrl}
        // 🌟 修正ポイント：日本語フォント対応
        options={pdfOptions}
        onLoadSuccess={({ numPages }) => {
          setNumPages(numPages);
          setLoadError(null);
        }}
        onLoadError={(error) => {
          console.error("PDF Load Error:", error);
          setLoadError(error.message);
        }}
        className="flex flex-col items-center py-10 gap-10 w-full"
        loading={
          <div className="flex flex-col items-center justify-center mt-32 absolute top-0">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-indigo-400 font-black tracking-widest animate-pulse">LOADING PDF...</div>
          </div>
        }
      >
        {/* エラー時の表示 */}
        {loadError && (
          <div className="mt-20 bg-rose-500/10 border border-rose-500/30 p-8 rounded-2xl max-w-lg text-center mx-4 z-50 relative">
            <h3 className="text-rose-500 font-black text-xl mb-3">🚨 PDF読み込みエラー</h3>
            <p className="text-rose-400 text-xs font-mono break-all leading-relaxed">
              {loadError}
            </p>
          </div>
        )}

        {/* ページ描画 */}
        {numPages && Array.from(new Array(numPages), (_, index) => (
          <div 
            key={`page_${index + 1}`}
            ref={(el) => { pageRefs.current[index + 1] = el; }} 
            className="relative shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden border border-white/5 bg-white"
          >
            <Page 
              pageNumber={index + 1} 
              scale={1.2} 
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading=""
            />
            {/* 赤ペン機能キャンバス */}
            <DrawingCanvas isDrawingMode={isDrawingMode} pageIndex={index + 1} />
          </div>
        ))}
      </Document>
    </div>
  );
});

PdfViewer.displayName = "PdfViewer";
export default PdfViewer;