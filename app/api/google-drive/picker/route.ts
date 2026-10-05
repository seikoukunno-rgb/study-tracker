import { NextRequest, NextResponse } from 'next/server';
import { connectedAccountToken, DriveError, driveErrorResponse, oauthOrigin } from '@/lib/google-drive/server';

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get('origin') !== oauthOrigin(request)) {
      throw new DriveError('許可されていないリクエストです。', 403, 'invalid_origin');
    }
    const apiKey = process.env.GOOGLE_PICKER_API_KEY;
    const appId = process.env.GOOGLE_CLOUD_PROJECT_NUMBER;
    if (!apiKey || !appId) throw new DriveError('Google Pickerの設定が不足しています。管理者にお問い合わせください。', 503, 'picker_not_configured');
    const { accountId } = await request.json();
    if (typeof accountId !== 'string' || !accountId) throw new DriveError('Googleアカウントを選択してください。', 400, 'account_required');
    const { accessToken, expiresIn } = await connectedAccountToken(accountId, true);
    // Only the short-lived token reaches Picker; never return the refresh token or secret.
    return NextResponse.json({ accessToken, expiresIn, apiKey, appId }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return driveErrorResponse(error); }
}
