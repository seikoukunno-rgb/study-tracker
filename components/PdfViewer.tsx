// components/PdfViewer.tsx
'use client';

import { useState, useRef, forwardRef, useImperativeHandle, useMemo, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import DrawingCanvas from './DrawingCanvas';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

const pdfOptions = { cMapUrl: `https://unpkg.com/pdfjs-dist@4.4.168/cmaps/`, cMapPacked: true };

type PdfViewerProps = {
  pdfUrl: string;
  drawingMode?: 'none' | 'pen' | 'eraser'; // 🌟 モードを受け取る
};

export type PdfViewerHandle = { scrollToPage: (pageNumber: number) => void; };

const PdfViewer = forwardRef<PdfViewerHandle, PdfViewerProps>(({ pdfUrl, drawingMode = 'none' }, ref) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  
  // 🌟 現在のズーム倍率を記憶する（これでするするスクロールを実現！）
  const [currentScale, setCurrentScale] = useState(1);

  const file = useMemo(() => ({ url: pdfUrl }), [pdfUrl]);

  useImperativeHandle(ref, () => ({
    scrollToPage: (pageNumber: number) => {
      const pageRefsCurrent = pageRefs.current;
      if (pageRefsCurrent && pageRefsCurrent[pageNumber]) {
        pageRefsCurrent[pageNumber]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }));

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const newWidth = containerRef.current.clientWidth;
        setContainerWidth(prev => Math.abs(prev - newWidth) > 20 ? newWidth : prev);
      }
    };
    const timer = setTimeout(updateWidth, 100);
    window.addEventListener('resize', updateWidth);
    return () => { clearTimeout(timer); window.removeEventListener('resize', updateWidth); };
  }, []);

  const pdfWidth = containerWidth > 0 ? (containerWidth > 800 ? 800 : containerWidth) : undefined;

  return (
    // 🌟 overflow-y-auto を追加し、純正スクロールを許可！
    <div ref={containerRef} className="h-full w-full bg-[#0a0a0a] overflow-y-auto relative no-scrollbar">
      {containerWidth > 0 && (
        <TransformWrapper
          initialScale={1}
          minScale={1}
          maxScale={4}
          disabled={drawingMode !== 'none'}
          centerZoomedOut={false}
          // 🌟 超重要：ズームしていない(1倍の)時はパン移動を無効化し、純正の「するするスクロール」に任せる！
          panning={{ disabled: currentScale <= 1.05 }}
          wheel={{ wheelDisabled: true }} // PCマウスのスクロールもスルスルに！
          doubleClick={{ disabled: true }}
          // 🌟 ズーム倍率が変わるたびに state を更新
          onTransformed={(ref) => setCurrentScale(ref.state.scale)}
        >
          <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full flex flex-col items-center">
            <Document
              file={file}
              options={pdfOptions}
              onLoadSuccess={({ numPages }) => { setNumPages(numPages); setLoadError(null); }}
              onLoadError={(error) => setLoadError(error.message)}
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
                  style={{ width: pdfWidth }}
                >
                  <Page 
                    pageNumber={index + 1} 
                    width={pdfWidth} 
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    loading=""
                  />
                  <DrawingCanvas mode={drawingMode} pageIndex={index + 1} />
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