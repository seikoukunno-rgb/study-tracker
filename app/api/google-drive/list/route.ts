import { NextRequest, NextResponse } from 'next/server';
import { connectedAccountToken, DriveError, driveErrorResponse, assertDriveResponse } from '@/lib/google-drive/server';

export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('accountId');
    if (!accountId) throw new DriveError('Googleアカウントを選択してください。', 400, 'account_required');
    const { accessToken } = await connectedAccountToken(accountId, true);
    const files = [];
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({
        q: "mimeType='application/pdf' and trashed=false", spaces: 'drive', pageSize: '100',
        fields: 'nextPageToken,files(id,name,createdTime,mimeType,isAppAuthorized)', orderBy: 'createdTime desc',
        supportsAllDrives: 'true', includeItemsFromAllDrives: 'true',
      });
      if (pageToken) params.set('pageToken', pageToken);
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store',
      });
      assertDriveResponse(response);
      const data = await response.json();
      // Previously granted broad scopes must not restore whole-Drive browsing.
      files.push(...(data.files ?? []).filter((file: { isAppAuthorized?: boolean }) => file.isAppAuthorized === true));
      pageToken = data.nextPageToken;
    } while (pageToken);
    return NextResponse.json({ files }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return driveErrorResponse(error); }
}
