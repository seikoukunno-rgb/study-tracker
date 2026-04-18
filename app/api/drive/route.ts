import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const fileId = request.nextUrl.searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { error: 'fileId is required' },
        { status: 400 }
      );
    }

    // サーバーサイドから Supabase セッションを取得
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server Component からはクッキーをセットできないので無視
            }
          },
        },
      }
    );

    // Authorization ヘッダー優先、なければセッションから取得
    const authHeader = request.headers.get('Authorization');
    let providerToken = authHeader?.replace('Bearer ', '') ?? null;

    if (!providerToken) {
      const { data: { session } } = await supabase.auth.getSession();
      providerToken = session?.provider_token ?? null;
    }

    if (!providerToken) {
      return NextResponse.json(
        { error: 'No provider token found. Please re-authenticate.' },
        { status: 401 }
      );
    }

    // Google Drive API にサーバーサイドからアクセス
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${providerToken}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Unauthorized: Session expired' },
          { status: 401 }
        );
      }
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        );
      }
      throw new Error(`Google Drive API error: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': arrayBuffer.byteLength.toString(),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Drive API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch file' },
      { status: 500 }
    );
  }
}
