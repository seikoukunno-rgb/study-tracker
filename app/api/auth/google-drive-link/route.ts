import { randomBytes, createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { DRIVE_FILE_SCOPE, googleClientConfig, oauthOrigin, driveErrorResponse } from '@/lib/google-drive/server';

export async function GET(request: NextRequest) {
  try {
    const origin = oauthOrigin(request);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(`${origin}/login`);
    const { clientId } = googleClientConfig();
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    const params = new URLSearchParams({
      client_id: clientId, redirect_uri: `${origin}/api/auth/google-drive-callback`, response_type: 'code',
      scope: [DRIVE_FILE_SCOPE, 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile', 'openid'].join(' '),
      access_type: 'offline', prompt: 'select_account consent', state,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256',
    });
    const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    response.cookies.set('mercury_drive_oauth', JSON.stringify({ state, verifier, userId: user.id, origin }), {
      httpOnly: true, secure: origin.startsWith('https:'), sameSite: 'lax', maxAge: 600, path: '/api/auth',
    });
    return response;
  } catch (error) { return driveErrorResponse(error); }
}
