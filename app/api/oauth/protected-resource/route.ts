// 保護リソースのメタデータ (/.well-known/oauth-protected-resource から rewrite)
import { NextResponse } from 'next/server';
import { CORS_HEADERS, originOf } from '../../../../lib/mcp/token';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const origin = originOf(req);
  return NextResponse.json(
    {
      resource: `${origin}/api/mcp`,
      authorization_servers: [origin],
      scopes_supported: ['mercury'],
      bearer_methods_supported: ['header'],
      resource_name: 'Mercury',
    },
    { headers: CORS_HEADERS }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
