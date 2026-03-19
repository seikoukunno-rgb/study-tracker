// components/PdfViewer.tsx
'use client';

import { useState, useRef, forwardRef, useImperativeHandle, useMemo, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
// 🌟 追加：スマホのピンチ操作を完璧にするライブラリ
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

  // 🌟 追加：画面の横幅を測ってPDFをピッタリはめるための準備
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const file = useMemo(() => ({ url: pdfUrl }), [pdfUrl]);

  useImperativeHandle(ref, () => ({
    scrollToPage: (pageNumber: number) => {
      const pageRefsCurrent = pageRefs.current;
      if (pageRefsCurrent && pageRefsCurrent[pageNumber]) {
        pageRefsCurrent[pageNumber]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }));

  // 🌟 追加：画面サイズが変わった時だけ横幅を再計算する（勝手な縮小バグを防止）
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const newWidth = containerRef.current.clientWidth;
        // 20px以上の大きな変化（画面回転など）がない限り再描画しないことで、URLバーによるバグを防ぐ！
        setContainerWidth(prev => Math.abs(prev - newWidth) > 20 ? newWidth : prev);
      }
    };
    const timer = setTimeout(updateWidth, 100);
    window.addEventListener('resize', updateWidth);
    return () => { clearTimeout(timer); window.removeEventListener('resize', updateWidth); };
  }, []);

  // PDFの横幅をコンテナにピッタリ合わせる（PCの時は最大800pxで制限）
  const pdfWidth = containerWidth > 0 ? (containerWidth > 800 ? 800 : containerWidth) : undefined;

  return (
    <div ref={containerRef} className="h-full w-full bg-[#0a0a0a] relative no-scrollbar">
      {containerWidth > 0 && (
        <TransformWrapper
          initialScale={1}
          minScale={1} // 🌟 1倍以下にならないように制限（これで横ブレを完全封印！）
          maxScale={4}
          disabled={isDrawingMode} // 🌟 ペンモードの時は画面が動かないように固定
          centerZoomedOut={false}  // 勝手に中央に戻るおせっかい機能をOFF
          panning={{ velocityDisabled: true }} // スクロール時のバウンドを防止
          doubleClick={{ disabled: true }} // スマホのダブルタップ誤爆を防止
        >
          <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full flex flex-col items-center">
            <Document
              file={file}
              options={pdfOptions}
              onLoadSuccess={({ numPages }) => { setNumPages(numPages); setLoadError(null); }}
              onLoadError={(error) => { console.error("PDF Error:", error); setLoadError(error.message); }}
              className="flex flex-col items-center py-4 gap-6 w-full"
              loading={
                <div className="flex flex-col items-center justify-center mt-32 absolute top-0">
                  <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <div className="text-indigo-400 font-black tracking-widest animate-pulse">LOADING...</div>
                </div>
              }
            >
              {numPages && Array.from(new Array(numPages), (_, index) => (
                <div 
                  key={`page_${index + 1}`}
                  ref={(el) => { pageRefs.current[index + 1] = el; }} 
                  className="relative shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden bg-white mb-2"
                  style={{ width: pdfWidth }} // 🌟 枠のサイズもピッタリはめる
                >
                  <Page 
                    pageNumber={index + 1} 
                    width={pdfWidth} // 🌟 scaleを廃止し、横幅を直接指定してピッタリはめる！
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    loading=""
                  />
                  <DrawingCanvas isDrawingMode={isDrawingMode} pageIndex={index + 1} />
                </div>
              ))}
            </Document>
          </TransformComponent>
        </TransformWrapper>
      )}
    </div>
  );
});

PdfViewer.displayName = "PdfViewer";
export default PdfViewer;