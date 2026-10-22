// OAuth 認可サーバーのメタデータ (/.well-known/oauth-authorization-server から rewrite)
import { NextResponse } from 'next/server';
import { CORS_HEADERS, originOf } from '../../../../lib/mcp/token';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const origin = originOf(req);
  return NextResponse.json(
    {
      issuer: origin,
      authorization_endpoint: `${origin}/api/oauth/authorize`,
      token_endpoint: `${origin}/api/oauth/token`,
      registration_endpoint: `${origin}/api/oauth/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      scopes_supported: ['mercury'],
    },
    { headers: CORS_HEADERS }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
