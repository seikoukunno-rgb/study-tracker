export type PdfDocumentState = { key: string; url: string | null; loading: boolean; error: string | null };
export type PdfDocumentResult = { url: string; expiresAt?: number };

// Owns object URLs and ensures a slow, cancelled request cannot replace the selected PDF.
export function createPdfDocumentLoader(onChange: (state: PdfDocumentState) => void) {
  const cache = new Map<string, PdfDocumentResult>();
  let controller: AbortController | undefined;
  let generation = 0;
  const release = (url: string) => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); };
  const cancel = () => { generation++; controller?.abort(); controller = undefined; };
  return {
    cancel,
    async load(key: string, fetchDocument: (signal: AbortSignal) => Promise<PdfDocumentResult>) {
      cancel();
      const version = generation;
      const cached = cache.get(key);
      if (cached && (!cached.expiresAt || cached.expiresAt > Date.now())) {
        onChange({ key, url: cached.url, loading: false, error: null });
        return;
      }
      if (cached) { cache.delete(key); release(cached.url); }
      const request = new AbortController();
      controller = request;
      onChange({ key, url: null, loading: true, error: null });
      try {
        const result = await fetchDocument(request.signal);
        if (version !== generation || request.signal.aborted) { release(result.url); return; }
        cache.set(key, result);
        onChange({ key, url: result.url, loading: false, error: null });
      } catch (error) {
        if (version !== generation || request.signal.aborted) return;
        onChange({ key, url: null, loading: false, error: error instanceof Error ? error.message : 'PDFの取得に失敗しました。' });
      }
    },
    dispose() {
      cancel();
      cache.forEach(result => release(result.url));
      cache.clear();
    },
  };
}
