import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { connectedAccountToken, refreshAccessToken, DriveError, driveErrorResponse, assertDriveResponse } from '@/lib/google-drive/server';

export async function GET(request: NextRequest) {
  try {
    const fileId = request.nextUrl.searchParams.get('fileId');
    const accountId = request.nextUrl.searchParams.get('accountId');
    if (!fileId) throw new DriveError('fileId is required', 400, 'file_required');
    let token: string | null = null;
    let refreshToken: string | null = null;
    if (accountId) {
      token = (await connectedAccountToken(accountId)).accessToken;
    } else {
      // Keep existing materials associated with the primary Supabase Google login readable.
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new DriveError('ログインしてください。', 401, 'unauthorized');
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.provider_token ?? null;
      refreshToken = session?.provider_refresh_token ?? null;
      if (!token && refreshToken) token = (await refreshAccessToken(refreshToken)).accessToken;
    }
    if (!token) throw new DriveError('Googleアカウントを再連携してください。', 401, 'reconnect_required');
    const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
    const fetchFile = (accessToken: string) => fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
    let response = await fetchFile(token);
    if (response.status === 401 && refreshToken) response = await fetchFile((await refreshAccessToken(refreshToken)).accessToken);
    assertDriveResponse(response);
    if (!response.headers.get('Content-Type')?.includes('application/pdf')) {
      throw new DriveError('選択したファイルはPDFではありません。', 415, 'not_pdf');
    }
    return new NextResponse(response.body, { headers: {
      'Content-Type': 'application/pdf', 'Content-Disposition': 'inline',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) { return driveErrorResponse(error); }
}
