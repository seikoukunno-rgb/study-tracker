// components/PdfViewer.tsx
'use client';

import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// 🌟 【修正】CSSのインポートパスを、より互換性の高いものに変更
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// 🌟 【重要】Vercelでのビルドエラーを防ぐため、CDNからWorkerを読み込む
// これにより、本番環境でもWorkerが見つからないエラーを回避できます
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type PdfViewerProps = {
  pdfUrl: string;
};

// 外部（Sidebarなど）から scrollToPage を呼び出すための型定義
export type PdfViewerHandle = {
  scrollToPage: (pageNumber: number) => void;
};

const PdfViewer = forwardRef<PdfViewerHandle, PdfViewerProps>(({ pdfUrl }, ref) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  
  // 各ページのDOM要素を保持するためのRef（スクロール用）
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // 🌟 親コンポーネントに公開する「魔法のスクロール関数」
  useImperativeHandle(ref, () => ({
    scrollToPage: (pageNumber: number) => {
      const pageElement = pageRefs.current[pageNumber];
      if (pageElement) {
        // スムーズに該当ページまでスライドさせる
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
        // 読み込み中のスタイリッシュな表示
        loading={
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-white font-black tracking-widest animate-pulse">PDF LOADING...</p>
          </div>
        }
        // エラー時の表示
        error={<div className="text-rose-500 font-bold">PDFの読み込みに失敗しました</div>}
      >
        {numPages && Array.from(new Array(numPages), (el, index) => (
          <div 
            key={`page_${index + 1}`}
            ref={(el) => { pageRefs.current[index + 1] = el; }} 
            className="shadow-2xl shadow-black/80 overflow-hidden rounded-xl transition-transform hover:scale-[1.01]"
          >
            {/* 🌟 scaleを1.2に設定し、視認性を高めています */}
            <Page 
              pageNumber={index + 1} 
              scale={1.2} 
              // モバイル対応：画面幅に合わせて調整されるように設定
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