import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getAccessToken(refreshToken: string): Promise<string | null> {
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

export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('accountId');
    const query = request.nextUrl.searchParams.get('query');

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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let token: string | null = null;

    if (accountId) {
      // 連携済みアカウントのrefresh_tokenでアクセストークンを取得
      const { data: account } = await supabase
        .from('user_connected_google_accounts')
        .select('refresh_token')
        .eq('id', accountId)
        .eq('user_id', user.id)
        .single();

      if (!account) {
        return NextResponse.json({ error: 'Connected account not found' }, { status: 404 });
      }

      token = await getAccessToken(account.refresh_token);
    } else {
      // レガシー: Authorizationヘッダーのprovider_tokenを使用
      token = request.headers.get('Authorization')?.replace('Bearer ', '') ?? null;
    }

    if (!token) {
      return NextResponse.json({ error: 'No valid token' }, { status: 401 });
    }

    const searchQuery = query || "mimeType='application/pdf'";
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&spaces=drive&pageSize=50&fields=files(id,name,createdTime,mimeType)&orderBy=createdTime desc`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ error: 'Unauthorized: Token expired or invalid' }, { status: 401 });
      }
      throw new Error(`Google Drive API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Google Drive list error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch files' }, { status: 500 });
  }
}
