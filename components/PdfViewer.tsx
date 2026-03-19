// components/PdfViewer.tsx
'use client';

import { useState, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import DrawingCanvas from './DrawingCanvas';

// 🌟 本社（API）に合わせて、現場（Worker）も最新の 4.4.168 に統一！
// ⚠️ 拡張子が .mjs になっていることに注意！
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

// 🌟 日本語フォント辞書も 4.4.168 に統一！
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
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // 🌟 【最重要】タイマーの「チカチカ」ループを防ぐ魔法
  // URLだけを純粋に渡し、余計な認証情報を省くことでSupabaseのブロックを回避します
  const file = useMemo(() => ({ url: pdfUrl }), [pdfUrl]);

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
        file={file}
        options={pdfOptions}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        // エラーが起きたらブラウザの裏側（コンソール）に詳細を出す
        onLoadError={(error) => console.error("🚨 PDF読み込みエラー詳細:", error)}
        className="flex flex-col items-center py-10 gap-10 w-full"
        loading={
          <div className="flex flex-col items-center justify-center mt-32 absolute top-0">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-indigo-400 font-black tracking-widest animate-pulse">LOADING PDF...</div>
          </div>
        }
        // カスタムエラー表示
        error={
          <div className="mt-32 bg-rose-500/10 border border-rose-500/30 p-8 rounded-2xl text-center mx-4 z-50">
            <h3 className="text-rose-500 font-black text-xl mb-3">PDFの取得に失敗しました</h3>
            <p className="text-rose-400 text-sm font-bold">F12キーを押して「Console」タブの赤いエラーを確認してください。</p>
          </div>
        }
      >
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