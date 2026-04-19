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

    const { data: { session } } = await supabase.auth.getSession();
    let providerToken = session?.provider_token ?? null;
    const refreshToken = session?.provider_refresh_token ?? null;

    if (!providerToken && !refreshToken) {
      return NextResponse.json(
        { error: 'No provider token found. Please re-authenticate.' },
        { status: 401 }
      );
    }

    let response = providerToken ? await fetchFromDrive(fileId, providerToken) : null;

    // トークン期限切れの場合はリフレッシュして再試行
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

    const arrayBuffer = await response.arrayBuffer();

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
