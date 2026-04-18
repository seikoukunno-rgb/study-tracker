import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const query = request.nextUrl.searchParams.get('query');

    if (!token) {
      return NextResponse.json(
        { error: 'No authentication token provided' },
        { status: 401 }
      );
    }

    // Google Drive API で PDF ファイル一覧を取得
    const searchQuery = query || "mimeType='application/pdf'";
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&spaces=drive&pageSize=50&fields=files(id,name,createdTime,mimeType)&orderBy=createdTime desc`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Unauthorized: Token expired or invalid' },
          { status: 401 }
        );
      }
      throw new Error(`Google Drive API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Google Drive list error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch files' },
      { status: 500 }
    );
  }
}
