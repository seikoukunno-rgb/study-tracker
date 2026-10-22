// トークン発行: 認可コード → アクセストークン、リフレッシュトークン → 新しいトークン
import { NextResponse } from 'next/server';
import { isAllowedUser } from '../../../../lib/mcp/admin-client';
import {
  ACCESS_TOKEN_TTL,
  CORS_HEADERS,
  REFRESH_TOKEN_TTL,
  nowSec,
  pkceChallenge,
  signToken,
  verifyToken,
} from '../../../../lib/mcp/token';

export const dynamic = 'force-dynamic';

const HEADERS = { ...CORS_HEADERS, 'Cache-Control': 'no-store' };

function oauthError(error: string, description: string, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status, headers: HEADERS });
}

async function issue(sub: string) {
  if (!(await isAllowedUser(sub))) return oauthError('invalid_grant', 'このアカウントは利用できません');
  return NextResponse.json(
    {
      access_token: signToken({ typ: 'access', sub, exp: nowSec() + ACCESS_TOKEN_TTL }),
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_TTL,
      refresh_token: signToken({ typ: 'refresh', sub, exp: nowSec() + REFRESH_TOKEN_TTL }),
      scope: 'mercury',
    },
    { headers: HEADERS }
  );
}

export async function POST(req: Request) {
  const contentType = req.headers.get('content-type') ?? '';
  let params: Record<string, string> = {};
  try {
    if (contentType.includes('application/json')) {
      params = await req.json();
    } else {
      params = Object.fromEntries(new URLSearchParams(await req.text()));
    }
  } catch {
    return oauthError('invalid_request', 'リクエストを読み取れません');
  }

  if (params.grant_type === 'authorization_code') {
    const code = verifyToken(params.code, 'code');
    if (!code) return oauthError('invalid_grant', '認可コードが無効か期限切れです');
    if (params.redirect_uri && params.redirect_uri !== code.ru) {
      return oauthError('invalid_grant', 'redirect_uri が一致しません');
    }
    if (!params.code_verifier || pkceChallenge(params.code_verifier) !== code.cc) {
      return oauthError('invalid_grant', 'PKCE の検証に失敗しました');
    }
    return issue(code.sub);
  }

  if (params.grant_type === 'refresh_token') {
    const refresh = verifyToken(params.refresh_token, 'refresh');
    if (!refresh) return oauthError('invalid_grant', 'リフレッシュトークンが無効か期限切れです');
    return issue(refresh.sub);
  }

  return oauthError('unsupported_grant_type', '対応していない grant_type です');
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
