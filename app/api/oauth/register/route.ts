// 動的クライアント登録 (Claude が最初に呼ぶ)
// クライアント情報は保存しない。リダイレクト先の制限と管理者チェックで守る。
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { CORS_HEADERS, isAllowedRedirect, nowSec } from '../../../../lib/mcp/token';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // 空ボディでも登録は受け付ける
  }

  const redirectUris = Array.isArray(body.redirect_uris) ? (body.redirect_uris as string[]) : [];
  if (redirectUris.length === 0 || !redirectUris.every(isAllowedRedirect)) {
    return NextResponse.json(
      { error: 'invalid_redirect_uri', error_description: '許可されていないリダイレクト先です' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  return NextResponse.json(
    {
      client_id: `mercury-${crypto.randomUUID()}`,
      client_id_issued_at: nowSec(),
      client_name: typeof body.client_name === 'string' ? body.client_name : 'Claude',
      redirect_uris: redirectUris,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    },
    { status: 201, headers: CORS_HEADERS }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
