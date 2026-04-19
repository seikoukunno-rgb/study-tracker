import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');

  if (errorParam || !code) {
    return NextResponse.redirect(`${origin}/google-drive-setup?error=oauth_cancelled`);
  }

  const redirectUri = `${origin}/api/auth/google-drive-callback`;

  // コードをトークンと交換
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    console.error('Token exchange failed:', await tokenRes.text());
    return NextResponse.redirect(`${origin}/google-drive-setup?error=token_exchange_failed`);
  }

  const { access_token, refresh_token } = await tokenRes.json();

  if (!refresh_token) {
    return NextResponse.redirect(`${origin}/google-drive-setup?error=no_refresh_token`);
  }

  // Googleアカウントのemailを取得
  const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!userinfoRes.ok) {
    return NextResponse.redirect(`${origin}/google-drive-setup?error=userinfo_failed`);
  }

  const { email } = await userinfoRes.json();

  // 現在のSupabaseセッション（メインアカウントA）からuser_idを取得
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
    return NextResponse.redirect(`${origin}/login`);
  }

  // 連携アカウント情報をDBに保存（同じemailなら上書き）
  const { error: upsertError } = await supabase
    .from('user_connected_google_accounts')
    .upsert(
      { user_id: user.id, google_email: email, refresh_token },
      { onConflict: 'user_id,google_email' }
    );

  if (upsertError) {
    console.error('Upsert error:', upsertError);
    return NextResponse.redirect(`${origin}/google-drive-setup?error=db_error`);
  }

  return NextResponse.redirect(`${origin}/google-drive-setup?connected=true`);
}
