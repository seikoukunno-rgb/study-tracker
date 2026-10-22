// Claude コネクタ (リモートMCP) 用の OAuth トークン処理
// 外部ライブラリを使わず、HMAC 署名付きの自前トークンを発行・検証する。
// 署名鍵は SUPABASE_SERVICE_ROLE_KEY から導出する (環境変数を増やさないため)。
import crypto from 'crypto';

const PREFIX = 'mcp1';

export type TokenType = 'code' | 'access' | 'refresh' | 'csrf';

export type TokenPayload = {
  typ: TokenType;
  sub: string;
  exp: number;
  [key: string]: unknown;
};

function signingKey(): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('SUPABASE_SERVICE_ROLE_KEY が設定されていません');
  return crypto.createHash('sha256').update(`mercury-mcp-oauth-v1|${secret}`).digest();
}

export function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

export function signToken(payload: TokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', signingKey()).update(`${PREFIX}.${body}`).digest('base64url');
  return `${PREFIX}.${body}.${sig}`;
}

export function verifyToken(token: string | null | undefined, typ: TokenType): TokenPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;

  const expected = crypto.createHmac('sha256', signingKey()).update(`${PREFIX}.${parts[1]}`).digest();
  const actual = Buffer.from(parts[2], 'base64url');
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;

  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (payload.typ !== typ) return null;
  if (typeof payload.exp !== 'number' || payload.exp < nowSec()) return null;
  return payload;
}

// PKCE (S256) の検証用
export function pkceChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// Claude のコールバック、またはローカル (Claude Code) だけを許可する
export function isAllowedRedirect(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.protocol === 'https:' && ['claude.ai', 'claude.com'].includes(u.hostname)) {
      return u.pathname === '/api/mcp/auth_callback';
    }
    if (u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function originOf(req: Request): string {
  return new URL(req.url).origin;
}

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id',
  'Access-Control-Expose-Headers': 'WWW-Authenticate, Mcp-Session-Id',
};

export const ACCESS_TOKEN_TTL = 60 * 60; // 1時間
export const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 90; // 90日
export const CODE_TTL = 5 * 60; // 5分
