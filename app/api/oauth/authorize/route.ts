// 認可画面: Mercury にログイン中の本人(管理者)が「許可する」を押すと、Claude に認可コードを返す
import { NextResponse } from 'next/server';
import { createClient } from '../../../utils/supabase/server';
import { isAllowedUser } from '../../../../lib/mcp/admin-client';
import { CODE_TTL, isAllowedRedirect, nowSec, signToken, verifyToken } from '../../../../lib/mcp/token';

export const dynamic = 'force-dynamic';

const FIELDS = ['client_id', 'redirect_uri', 'state', 'code_challenge', 'code_challenge_method', 'scope', 'resource'] as const;
type Params = Record<(typeof FIELDS)[number], string>;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function page(title: string, body: string, status = 200): NextResponse {
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;background:#f1f5f9;color:#0f172a;padding:16px}
  .card{background:#fff;border-radius:20px;padding:32px;max-width:420px;width:100%;box-shadow:0 10px 30px rgba(15,23,42,.08)}
  h1{font-size:20px;margin:0 0 12px} p{line-height:1.7;color:#475569;font-size:14px} ul{color:#475569;font-size:14px;line-height:1.8;padding-left:20px}
  .btns{display:flex;gap:12px;margin-top:24px} button,a.btn{flex:1;border:0;border-radius:12px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;text-align:center;text-decoration:none}
  .ok{background:#4f46e5;color:#fff} .ng{background:#e2e8f0;color:#334155}
  @media (prefers-color-scheme:dark){body{background:#0a0a0a;color:#f8fafc}.card{background:#1c1c1e}p,ul{color:#94a3b8}.ng{background:#2c2c2e;color:#e2e8f0}}
</style></head><body><div class="card">${body}</div></body></html>`;
  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

function readParams(get: (k: string) => string | null): Params {
  const p = {} as Params;
  for (const f of FIELDS) p[f] = get(f) ?? '';
  return p;
}

function validate(p: Params, responseType: string | null): string | null {
  if (responseType !== null && responseType !== 'code') return 'response_type は code のみ対応しています';
  if (!p.client_id) return 'client_id がありません';
  if (!isAllowedRedirect(p.redirect_uri)) return '許可されていないリダイレクト先です';
  if (!p.code_challenge || p.code_challenge_method !== 'S256') return 'PKCE (S256) が必要です';
  return null;
}

async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const p = readParams((k) => url.searchParams.get(k));
  const err = validate(p, url.searchParams.get('response_type'));
  if (err) return page('接続エラー', `<h1>接続できません</h1><p>${escapeHtml(err)}</p>`, 400);

  const user = await currentUser();
  if (!user) {
    return page(
      'ログインが必要です',
      `<h1>先に Mercury にログインしてください</h1>
       <p>このブラウザで Mercury にログインしてから、Claude の画面でもう一度「連携/接続」を押してください。</p>
       <div class="btns"><a class="btn ok" href="${url.origin}/login" target="_blank">Mercury にログイン</a></div>`,
      401
    );
  }
  if (!(await isAllowedUser(user.id))) {
    return page('利用できません', `<h1>このアカウントでは接続できません</h1><p>現在、このコネクタは管理者のみ利用できます。</p>`, 403);
  }

  const csrf = signToken({ typ: 'csrf', sub: user.id, exp: nowSec() + 600 });
  const hidden = FIELDS.map((f) => `<input type="hidden" name="${f}" value="${escapeHtml(p[f])}">`).join('');

  return page(
    'Claude と Mercury を接続',
    `<h1>Claude が Mercury へのアクセスを求めています</h1>
     <p>ログイン中: <b>${escapeHtml(user.email ?? user.id)}</b></p>
     <p>許可すると、Claude はあなたのアカウントについて次のことができます。</p>
     <ul><li>学習時間・学習記録を見る</li><li>教材とノートを読む</li><li>Todo(リマインダー)を見る・追加する</li></ul>
     <form method="post">${hidden}<input type="hidden" name="csrf" value="${csrf}">
       <div class="btns"><button class="ng" name="decision" value="deny">拒否</button><button class="ok" name="decision" value="allow">許可する</button></div>
     </form>`
  );
}

export async function POST(req: Request) {
  const form = await req.formData();
  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === 'string' ? v : null;
  };
  const p = readParams(get);
  const err = validate(p, null);
  if (err) return page('接続エラー', `<h1>接続できません</h1><p>${escapeHtml(err)}</p>`, 400);

  const user = await currentUser();
  const csrf = verifyToken(get('csrf'), 'csrf');
  if (!user || !csrf || csrf.sub !== user.id || !(await isAllowedUser(user.id))) {
    return page('接続エラー', `<h1>接続できません</h1><p>セッションが切れました。Claude からもう一度接続してください。</p>`, 403);
  }

  const back = new URL(p.redirect_uri);
  if (p.state) back.searchParams.set('state', p.state);

  if (get('decision') !== 'allow') {
    back.searchParams.set('error', 'access_denied');
    return NextResponse.redirect(back, 303);
  }

  const code = signToken({
    typ: 'code',
    sub: user.id,
    exp: nowSec() + CODE_TTL,
    cid: p.client_id,
    ru: p.redirect_uri,
    cc: p.code_challenge,
  });
  back.searchParams.set('code', code);
  return NextResponse.redirect(back, 303);
}
