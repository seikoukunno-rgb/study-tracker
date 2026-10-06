import { NextRequest, NextResponse } from 'next/server';

// 教材（書籍）検索。ブラウザから直接 Google Books を叩くと
// 共有IPのクォータ超過(429)やAPIキーのリファラ制限(403)で失敗しやすいので、サーバー経由にする。
// Google Books が失敗したら 国立国会図書館サーチ(NDL) にフォールバックする。
export const runtime = 'nodejs';
export const maxDuration = 30;

type BookItem = {
  id: string;
  title: string;
  authors: string[];
  thumbnail: string | null;
  rating: number;
  ratingsCount: number;
  isbn: string;
};

const TIMEOUT_MS = 8000;
// APIキーに「HTTPリファラ制限」がかかっていても通るよう、サーバーからも本番サイトのリファラを付ける
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mercury-study47.com';
const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithTimeout(url: string, headers?: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal, cache: 'no-store', headers });
  } finally {
    clearTimeout(timer);
  }
}

type Debug = string[];

async function searchGoogleBooks(q: string, debug: Debug): Promise<BookItem[]> {
  const key = process.env.GOOGLE_BOOKS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY || '';
  const base = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=30&printType=books`;
  // キーが原因で弾かれた場合に備え、キーなしでも試す
  const urls = key ? [`${base}&key=${encodeURIComponent(key)}`, base] : [base];

  let lastErr: unknown = new Error('google books failed');
  for (const url of urls) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetchWithTimeout(url, { Referer: SITE_URL + '/' });
        if (res.ok) {
          const data = await res.json();
          debug.push(`google ${url.includes('key=') ? 'key' : 'nokey'} 200 total=${data.totalItems ?? '?'} items=${(data.items || []).length}`);
          return (data.items || []).map((item: any): BookItem => {
            const info = item.volumeInfo || {};
            const ids: any[] = info.industryIdentifiers || [];
            const isbn =
              ids.find((i) => i.type === 'ISBN_13')?.identifier ||
              ids.find((i) => i.type === 'ISBN_10')?.identifier ||
              '';
            const thumb = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;
            return {
              id: item.id,
              title: info.title || '(無題)',
              authors: info.authors || [],
              thumbnail: thumb ? String(thumb).replace('http://', 'https://') : null,
              rating: info.averageRating || 0,
              ratingsCount: info.ratingsCount || 0,
              isbn,
            };
          });
        }
        lastErr = new Error(`google books ${res.status}`);
        const bodyText = (await res.text()).slice(0, 300);
        debug.push(`google ${url.includes('key=') ? 'key' : 'nokey'} ${res.status} ${bodyText.replace(/\s+/g, ' ').slice(0, 160)}`);
        console.error('Google Books error:', res.status, bodyText);
        if (res.status === 429 || !RETRY_STATUS.has(res.status)) break; // 400/403など → 次のURL(キーなし)へ
      } catch (e) {
        lastErr = e;
        debug.push(`google ${url.includes('key=') ? 'key' : 'nokey'} exception ${String(e).slice(0, 80)}`);
      }
      await sleep(400);
    }
  }
  throw lastErr;
}

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();

async function searchNdl(q: string, debug: Debug): Promise<BookItem[]> {
  // 検索方式を順に試す（全文 → タイトル）。0件なら次へ
  const urls = [
    `https://ndlsearch.ndl.go.jp/api/opensearch?any=${encodeURIComponent(q)}&cnt=30`,
    `https://ndlsearch.ndl.go.jp/api/opensearch?title=${encodeURIComponent(q)}&cnt=30`,
  ];
  let xml = '';
  for (const url of urls) {
    const res = await fetchWithTimeout(url);
    xml = await res.text();
    debug.push(`ndl ${res.status} len=${xml.length} items=${(xml.match(/<item[ >]/g) || []).length}`);
    if (!res.ok) throw new Error(`ndl ${res.status}`);
    if (/<item[ >]/.test(xml)) break;
  }
  const items: BookItem[] = [];
  const seen = new Set<string>();
  for (const m of xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/g)) {
    const block = m[1];
    const title = decode(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '');
    if (!title) continue;
    const isbnRaw = block.match(/<dc:identifier[^>]*ISBN[^>]*>([\s\S]*?)<\/dc:identifier>/)?.[1] || '';
    const isbn = decode(isbnRaw).replace(/[^0-9Xx]/g, '');
    const link = decode(block.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '');
    const id = isbn || link || title;
    if (seen.has(id)) continue;
    seen.add(id);
    const authors = [...block.matchAll(/<dc:creator>([\s\S]*?)<\/dc:creator>/g)].map((a) => decode(a[1]));
    items.push({
      id: `ndl-${id}`,
      title,
      authors,
      thumbnail: isbn ? `https://ndlsearch.ndl.go.jp/thumbnail/${isbn}.jpg` : null,
      rating: 0,
      ratingsCount: 0,
      isbn,
    });
  }
  return items;
}

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ items: [], source: 'none' });
  if (q.length > 200) return NextResponse.json({ error: '検索ワードが長すぎます' }, { status: 400 });

  const debug: Debug = [];
  try {
    const items = await searchGoogleBooks(q, debug);
    if (items.length > 0) return NextResponse.json({ items, source: 'google' });
  } catch (e) {
    console.error('Google Books failed, falling back to NDL:', e);
  }

  try {
    const items = await searchNdl(q, debug);
    return NextResponse.json({ items, source: 'ndl' });
  } catch (e) {
    console.error('NDL failed:', e);
    return NextResponse.json({ error: '検索サービスに接続できませんでした' }, { status: 502 });
  }
}
