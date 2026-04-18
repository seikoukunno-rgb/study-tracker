import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get('action');

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
              // 無視
            }
          },
        },
      }
    );

    // セッションからプロバイダトークンを取得
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.provider_token) {
      return NextResponse.json(
        { error: 'No provider token found' },
        { status: 401 }
      );
    }

    if (action === 'listCalendars') {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: {
            'Authorization': `Bearer ${session.provider_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Calendar API error: ${response.status}`);
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Calendar API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}
