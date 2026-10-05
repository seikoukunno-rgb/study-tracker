import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { DRIVE_FILE_SCOPE, googleClientConfig, oauthOrigin, refreshAccessToken } from '@/lib/google-drive/server';

export async function GET(request: NextRequest) {
  const origin = oauthOrigin(request);
  const redirect = (error?: string) => {
    const response = NextResponse.redirect(`${origin}/google-drive-setup?${error ? `error=${error}` : 'connected=true'}`);
    response.cookies.set('mercury_drive_oauth', '', { maxAge: 0, path: '/api/auth' });
    return response;
  };
  try {
    const saved = request.cookies.get('mercury_drive_oauth')?.value;
    if (!saved) return redirect('invalid_state');
    const flow = JSON.parse(saved);
    if (!flow.state || flow.state !== request.nextUrl.searchParams.get('state') || flow.origin !== origin) return redirect('invalid_state');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== flow.userId) return redirect('invalid_state');
    const code = request.nextUrl.searchParams.get('code');
    if (request.nextUrl.searchParams.get('error') || !code) return redirect('oauth_cancelled');
    const { clientId, clientSecret } = googleClientConfig();
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: `${origin}/api/auth/google-drive-callback`, grant_type: 'authorization_code', code_verifier: flow.verifier }),
    });
    if (!tokenRes.ok) return redirect('token_exchange_failed');
    const tokens = await tokenRes.json();
    if (!tokens.access_token || !tokens.scope?.split(' ').includes(DRIVE_FILE_SCOPE)) return redirect('scope_missing');
    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }, cache: 'no-store',
    });
    if (!userinfoRes.ok) return redirect('userinfo_failed');
    const { email, verified_email } = await userinfoRes.json();
    if (typeof email !== 'string' || !verified_email) return redirect('userinfo_failed');
    // Preserve the same row ID so existing materials/file_account_map continue to work.
    let refreshToken = tokens.refresh_token;
    if (!refreshToken) {
      const { data: existing, error } = await supabase.from('user_connected_google_accounts')
        .select('refresh_token').eq('user_id', user.id).eq('google_email', email).maybeSingle();
      if (error) return redirect('db_error');
      refreshToken = existing?.refresh_token;
      if (refreshToken) {
        try { await refreshAccessToken(refreshToken, true); }
        catch { return redirect('no_refresh_token'); }
      }
    }
    if (!refreshToken) return redirect('no_refresh_token');
    const { error } = await supabase.from('user_connected_google_accounts').upsert(
      { user_id: user.id, google_email: email, refresh_token: refreshToken },
      { onConflict: 'user_id,google_email' },
    );
    if (error) return redirect('db_error');
    return redirect();
  } catch { return redirect('oauth_failed'); }
}
