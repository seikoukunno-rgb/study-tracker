'use client';

import { useState, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { FileText } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
const pdfOptions = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
};

function getPdfFirstUrl(pdfUrl: string | string[] | null | undefined): string | null {
  if (!pdfUrl || pdfUrl === '[]' || pdfUrl === '') return null;
  if (Array.isArray(pdfUrl)) return pdfUrl[0] || null;
  if (typeof pdfUrl === 'string') {
    try {
      const parsed = JSON.parse(pdfUrl);
      if (Array.isArray(parsed)) return parsed[0] || null;
    } catch {
      return pdfUrl.split(',')[0].trim() || null;
    }
  }
  return null;
}

type Props = {
  pdfUrl: string | string[] | null | undefined;
  width?: number;
};

export default function PdfThumbnail({ pdfUrl, width = 96 }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const firstUrl = useMemo(() => getPdfFirstUrl(pdfUrl), [pdfUrl]);
  const file = useMemo(() => (firstUrl ? { url: firstUrl } : null), [firstUrl]);

  if (!file) {
    return <FileText className="w-8 h-8 text-rose-300" />;
  }

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <FileText className="w-8 h-8 text-rose-300 animate-pulse" />
        </div>
      )}
      {error && <FileText className="w-8 h-8 text-rose-300" />}
      <div style={{ opacity: loaded && !error ? 1 : 0 }} className="w-full h-full overflow-hidden">
        <Document
          file={file}
          options={pdfOptions}
          onLoadSuccess={() => setLoaded(true)}
          onLoadError={() => setError(true)}
          loading={null}
          error={null}
        >
          <Page
            pageNumber={1}
            width={width}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            loading={null}
            error={null}
          />
        </Document>
      </div>
    </div>
  );
}
