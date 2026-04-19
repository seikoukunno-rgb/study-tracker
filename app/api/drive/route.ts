import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function refreshGoogleToken(refreshToken: string): Promise<string | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.access_token ?? null;
}

async function fetchFromDrive(fileId: string, token: string) {
  return fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export async function GET(request: NextRequest) {
  try {
    const fileId = request.nextUrl.searchParams.get('fileId');
    const accountId = request.nextUrl.searchParams.get('accountId');

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    let providerToken: string | null = null;
    let refreshToken: string | null = null;

    if (accountId) {
      // 連携済みアカウントのtokenを使用（メインセッションに影響しない）
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data: account } = await supabase
        .from('user_connected_google_accounts')
        .select('refresh_token')
        .eq('id', accountId)
        .eq('user_id', user.id)
        .single();

      if (!account) {
        return NextResponse.json({ error: 'Connected account not found' }, { status: 404 });
      }

      refreshToken = account.refresh_token;
    } else {
      // レガシー: Supabaseセッションのprovider_tokenを使用
      const { data: { session } } = await supabase.auth.getSession();
      providerToken = session?.provider_token ?? null;
      refreshToken = session?.provider_refresh_token ?? null;
    }

    if (!providerToken && !refreshToken) {
      return NextResponse.json(
        { error: 'No provider token found. Please re-authenticate.' },
        { status: 401 }
      );
    }

    let response = providerToken ? await fetchFromDrive(fileId, providerToken) : null;

    // tokenが期限切れの場合はrefresh_tokenで再取得
    if ((!response || response.status === 401 || response.status === 403) && refreshToken) {
      const newToken = await refreshGoogleToken(refreshToken);
      if (!newToken) {
        return NextResponse.json(
          { error: 'Token refresh failed. Please re-authenticate.' },
          { status: 401 }
        );
      }
      response = await fetchFromDrive(fileId, newToken);
    }

    if (!response || !response.ok) {
      console.error(`❌ Drive API failed — fileId: ${fileId}, status: ${response?.status}`);
      if (response?.status === 401 || response?.status === 403) {
        return NextResponse.json(
          { error: 'Unauthorized: Please re-authenticate with Google.' },
          { status: 401 }
        );
      }
      if (response?.status === 404) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      const body = await response?.text().catch(() => '');
      throw new Error(`Google Drive API error: ${response?.status} ${body}`);
    }

    const contentType = response.headers.get('Content-Type') ?? 'unknown';
    console.log(`✅ Drive API success — fileId: ${fileId}, status: ${response.status}, Content-Type: ${contentType}`);

    const arrayBuffer = await response.arrayBuffer();
    console.log(`📦 arrayBuffer size: ${arrayBuffer.byteLength} bytes`);

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': arrayBuffer.byteLength.toString(),
        'Content-Disposition': 'inline',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
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
