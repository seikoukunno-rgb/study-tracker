import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export class DriveError extends Error {
  constructor(message: string, public status: number, public code: string) {
    super(message);
  }
}

export function driveErrorResponse(error: unknown) {
  const known = error instanceof DriveError;
  return NextResponse.json({
    error: known ? error.message : 'Google Driveとの通信に失敗しました。時間をおいて再試行してください。',
    code: known ? error.code : 'drive_unavailable',
  }, { status: known ? error.status : 502, headers: { 'Cache-Control': 'no-store' } });
}

export function googleClientConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new DriveError('Google連携のサーバー設定が不足しています。', 503, 'oauth_not_configured');
  }
  return { clientId, clientSecret };
}

export function oauthOrigin(request: Request) {
  // Set APP_URL in production so proxy/internal hostnames cannot alter the callback.
  return new URL(process.env.APP_URL || request.url).origin;
}

export async function refreshAccessToken(refreshToken: string, requireFileScope = false) {
  const { clientId, clientSecret } = googleClientConfig();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', cache: 'no-store',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret,
      refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  const data = await response.json();
  if (!response.ok || typeof data.access_token !== 'string') {
    if (data.error === 'invalid_grant') {
      throw new DriveError('Google連携が失効しています。同じGoogleアカウントを再連携してください。', 401, 'reconnect_required');
    }
    throw new DriveError('Google認証トークンを更新できません。連携設定を確認してください。', 502, 'token_refresh_failed');
  }
  if (requireFileScope && (typeof data.scope !== 'string' || !data.scope.split(' ').includes(DRIVE_FILE_SCOPE))) {
    throw new DriveError('旧Drive権限の連携です。同じGoogleアカウントを再連携してください。', 403, 'scope_upgrade_required');
  }
  return { accessToken: data.access_token as string, expiresIn: Number(data.expires_in) || 3600 };
}

export async function connectedAccountToken(accountId: string, requireFileScope = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new DriveError('ログインしてください。', 401, 'unauthorized');
  const { data: account, error } = await supabase.from('user_connected_google_accounts')
    .select('refresh_token, google_email').eq('id', accountId).eq('user_id', user.id).maybeSingle();
  if (error) throw new DriveError('Google連携情報を取得できません。', 500, 'account_lookup_failed');
  if (!account) throw new DriveError('連携アカウントが見つかりません。', 404, 'account_not_found');
  if (!account.refresh_token) throw new DriveError('同じGoogleアカウントを再連携してください。', 401, 'reconnect_required');
  return { ...await refreshAccessToken(account.refresh_token, requireFileScope), email: account.google_email };
}

export function assertDriveResponse(response: Response) {
  if (response.ok) return;
  if (response.status === 401) throw new DriveError('Googleアカウントを再連携してください。', 401, 'reconnect_required');
  if (response.status === 403) throw new DriveError('ファイルへのアクセスが許可されていません。Google PickerでPDFを選択してください。Drive APIの有効化も確認してください。', 403, 'drive_forbidden');
  if (response.status === 404) throw new DriveError('ファイルが削除されたか、アクセスできません。Google PickerでPDFを選び直してください。', 404, 'file_not_found');
  throw new DriveError('Google Driveからファイルを取得できません。再試行してください。', 502, 'drive_unavailable');
}
