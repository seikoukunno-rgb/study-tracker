// components/PdfViewer.tsx
'use client';

import { useState, useRef, forwardRef, useImperativeHandle, useMemo, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
// 🌟 `TransformWrapper` の中に `DrawingCanvas` がいるので、coords補正が効きます
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import DrawingCanvas from './DrawingCanvas';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;
const pdfOptions = { cMapUrl: `https://unpkg.com/pdfjs-dist@4.4.168/cmaps/`, cMapPacked: true };

type PdfViewerProps = {
  pdfUrl: string;
  // 🌟 'text' モードを型定義に追加
  drawingMode?: 'none' | 'pen' | 'marker' | 'eraser' | 'text'; 
  drawingColor?: string;
  // 🌟 太さのPropを追加（デフォルト値を設定）
  penWidth?: number;
  markerWidth?: number;
  eraserWidth?: number;
};

export type PdfViewerHandle = { scrollToPage: (pageNumber: number) => void; };

const PdfViewer = forwardRef<PdfViewerHandle, PdfViewerProps>(({ 
  pdfUrl, 
  drawingMode = 'none', 
  drawingColor = '#ef4444',
  // デフォルトの太さ
  penWidth = 3,
  markerWidth = 18,
  eraserWidth = 30
}, ref) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const file = useMemo(() => ({ url: pdfUrl }), [pdfUrl]);

  useImperativeHandle(ref, () => ({
    scrollToPage: (pageNumber: number) => {
      const node = pageRefs.current[pageNumber];
      if (node && transformRef.current) {
        transformRef.current.zoomToElement(node, transformRef.current.state.scale, 300);
      } else if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }));

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.clientWidth);
    };
    const timer = setTimeout(updateWidth, 100);
    window.addEventListener('resize', updateWidth);
    return () => { clearTimeout(timer); window.removeEventListener('resize', updateWidth); };
  }, []);

  const pdfWidth = containerWidth > 0 ? containerWidth : undefined;

  return (
    <div ref={containerRef} className="h-full w-full bg-[#0a0a0a] overflow-y-auto overflow-x-hidden relative no-scrollbar">
      {containerWidth > 0 && (
        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          minScale={1}
          maxScale={4}
          // ペンモード中はズームを無効化（座標ズレを防ぐためではなく、誤操作防止）
          disabled={drawingMode !== 'none'}
          centerZoomedOut={false}
          panning={{ disabled: false }}
          wheel={{ wheelDisabled: false, step: 0.1 }}
          doubleClick={{ disabled: false, mode: "zoomIn" }}
        >
          <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full flex flex-col items-center">
            <Document
              file={file}
              options={pdfOptions}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              className="flex flex-col items-center gap-2 w-full"
              loading={<div className="mt-32 text-indigo-400 font-black animate-pulse">LOADING...</div>}
            >
              {numPages && Array.from(new Array(numPages), (_, index) => (
                <div 
                  key={`page_${index + 1}`}
                  ref={(el) => { pageRefs.current[index + 1] = el; }} 
                  className="relative shadow-2xl overflow-hidden bg-white mb-2"
                  style={{ width: pdfWidth }}
                >
                  <Page 
                    pageNumber={index + 1} 
                    width={pdfWidth} 
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    loading=""
                  />
                  {/* 🌟 キャンバスにすべての太さとモードを渡す */}
                  <DrawingCanvas 
                    mode={drawingMode} 
                    color={drawingColor} 
                    penWidth={penWidth}
                    markerWidth={markerWidth}
                    eraserWidth={eraserWidth}
                    pageIndex={index + 1} 
                  />
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