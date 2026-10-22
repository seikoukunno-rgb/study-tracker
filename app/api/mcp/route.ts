// Claude コネクタ本体 (リモートMCP, Streamable HTTP の JSON 応答版)
// すべての操作は、アクセストークンの持ち主 (sub) のデータだけに限定する。
// 引数で他人のユーザーIDを渡すことはできない。
import { NextResponse } from 'next/server';
import { createAdminClient, isAllowedUser } from '../../../lib/mcp/admin-client';
import { CORS_HEADERS, originOf, verifyToken } from '../../../lib/mcp/token';

export const dynamic = 'force-dynamic';

const SUPPORTED_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

type JsonRpcRequest = { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: Record<string, unknown> };
type Args = Record<string, unknown>;

const TOOLS = [
  {
    name: 'get_study_time',
    description: '自分の学習時間を集計する。期間を指定でき、教材ごとの内訳も返す。',
    inputSchema: {
      type: 'object',
      properties: {
        since: { type: 'string', description: '開始日 (YYYY-MM-DD)。省略可。' },
        until: { type: 'string', description: '終了日 (YYYY-MM-DD)。省略可。' },
      },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'list_recent_logs',
    description: '自分の最近の学習記録 (日付・時間・教材・感想) を新しい順に返す。',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: '件数 (既定10、最大50)。' } },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'list_materials',
    description: '自分の教材一覧 (ID とタイトル) を返す。read_notes で教材を絞るときに使う。',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'read_notes',
    description: '自分のノートを、教材名とページ番号つきで返す。',
    inputSchema: {
      type: 'object',
      properties: {
        material_id: { type: 'string', description: '特定の教材IDに絞る場合に指定。省略可。' },
        limit: { type: 'number', description: '最大件数 (既定20、最大100)。' },
      },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'list_todos',
    description: '自分のTodo(リマインダー)を通知日時の順に返す。',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'add_todo',
    description: '自分のTodo(リマインダー)を1件追加する。',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Todoの内容。' },
        remind_at: { type: 'string', description: '通知日時 (ISO 8601、例 2026-10-25T09:00:00+09:00)。省略時は現在時刻。' },
      },
      required: ['title'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
];

function clampNumber(v: unknown, def: number, max: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.min(Math.floor(n), max);
}

async function materialTitles(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const { data } = await createAdminClient().from('materials').select('id, title').in('id', ids);
  return Object.fromEntries((data ?? []).map((m) => [m.id, m.title]));
}

async function callTool(name: string, args: Args, uid: string): Promise<unknown> {
  const db = createAdminClient();

  switch (name) {
    case 'get_study_time': {
      let q = db.from('study_logs').select('material_id, duration_minutes').eq('student_id', uid);
      if (typeof args.since === 'string' && args.since) q = q.gte('studied_at', args.since);
      if (typeof args.until === 'string' && args.until) q = q.lte('studied_at', args.until);
      const { data, error } = await q;
      if (error) throw error;

      const byMaterial: Record<string, number> = {};
      let total = 0;
      for (const r of data ?? []) {
        const m = Number(r.duration_minutes) || 0;
        total += m;
        const k = r.material_id ?? '';
        byMaterial[k] = (byMaterial[k] ?? 0) + m;
      }
      const names = await materialTitles(Object.keys(byMaterial).filter(Boolean));
      return {
        対象期間: { since: args.since || '指定なし', until: args.until || '指定なし' },
        記録件数: data?.length ?? 0,
        合計時間_分: total,
        合計時間_時間: +(total / 60).toFixed(1),
        教材別: Object.entries(byMaterial)
          .map(([k, v]) => ({ 教材: k ? names[k] ?? k : '(教材なし)', 分: v, 時間: +(v / 60).toFixed(1) }))
          .sort((a, b) => b.分 - a.分),
      };
    }

    case 'list_recent_logs': {
      const limit = clampNumber(args.limit, 10, 50);
      const { data, error } = await db
        .from('study_logs')
        .select('studied_at, duration_minutes, thoughts, material_id')
        .eq('student_id', uid)
        .order('studied_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      const names = await materialTitles([...new Set((data ?? []).map((r) => r.material_id).filter(Boolean))]);
      return (data ?? []).map((r) => ({
        日付: r.studied_at,
        分: r.duration_minutes,
        教材: r.material_id ? names[r.material_id] ?? r.material_id : '(教材なし)',
        感想: r.thoughts ?? '',
      }));
    }

    case 'list_materials': {
      const { data, error } = await db
        .from('materials')
        .select('id, title, created_at')
        .eq('student_id', uid)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((m) => ({ id: m.id, タイトル: m.title }));
    }

    case 'read_notes': {
      const limit = clampNumber(args.limit, 20, 100);
      let q = db
        .from('notes')
        .select('pdf_id, page_number, content')
        .eq('user_id', uid)
        .order('page_number', { ascending: true })
        .limit(limit);
      if (typeof args.material_id === 'string' && args.material_id) q = q.eq('pdf_id', args.material_id);
      const { data, error } = await q;
      if (error) throw error;
      const names = await materialTitles([...new Set((data ?? []).map((n) => n.pdf_id).filter(Boolean))]);
      return (data ?? []).map((n) => ({
        教材: n.pdf_id ? names[n.pdf_id] ?? n.pdf_id : '(不明)',
        ページ: n.page_number,
        内容: n.content,
      }));
    }

    case 'list_todos': {
      const { data, error } = await db
        .from('reminders')
        .select('id, title, remind_at')
        .eq('student_id', uid)
        .order('remind_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => ({ id: r.id, 内容: r.title, 通知日時: r.remind_at }));
    }

    case 'add_todo': {
      const title = typeof args.title === 'string' ? args.title.trim() : '';
      if (!title) throw new Error('title は必須です');
      const remindAt = typeof args.remind_at === 'string' && args.remind_at ? args.remind_at : new Date().toISOString();
      const { data, error } = await db
        .from('reminders')
        .insert([{ student_id: uid, title, remind_at: remindAt }])
        .select('id, title, remind_at')
        .single();
      if (error) throw error;
      return { 結果: '追加しました', id: data.id, 内容: data.title, 通知日時: data.remind_at };
    }

    default:
      throw new Error(`未知のツールです: ${name}`);
  }
}

async function handle(msg: JsonRpcRequest, uid: string) {
  // 通知 (id なし) には応答しない
  if (msg.id === undefined || msg.id === null) return null;
  const reply = (result: unknown) => ({ jsonrpc: '2.0', id: msg.id, result });
  const fail = (code: number, message: string) => ({ jsonrpc: '2.0', id: msg.id, error: { code, message } });

  switch (msg.method) {
    case 'initialize': {
      const requested = String(msg.params?.protocolVersion ?? '');
      return reply({
        protocolVersion: SUPPORTED_VERSIONS.includes(requested) ? requested : SUPPORTED_VERSIONS[1],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'mercury', title: 'Mercury', version: '1.0.0' },
        instructions: 'Mercury (学習管理アプリ) の、ログイン中ユーザー本人の学習記録・教材・ノート・Todo を扱います。',
      });
    }
    case 'ping':
      return reply({});
    case 'tools/list':
      return reply({ tools: TOOLS });
    case 'tools/call': {
      const name = String(msg.params?.name ?? '');
      const args = (msg.params?.arguments ?? {}) as Args;
      try {
        const result = await callTool(name, args, uid);
        return reply({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return reply({ content: [{ type: 'text', text: `エラー: ${message}` }], isError: true });
      }
    }
    default:
      return fail(-32601, `未対応のメソッドです: ${msg.method}`);
  }
}

function unauthorized(req: Request) {
  const origin = originOf(req);
  return NextResponse.json(
    { jsonrpc: '2.0', id: null, error: { code: -32001, message: '認証が必要です' } },
    {
      status: 401,
      headers: {
        ...CORS_HEADERS,
        'WWW-Authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
      },
    }
  );
}

export async function POST(req: Request) {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const token = verifyToken(bearer, 'access');
  if (!token || !(await isAllowedUser(token.sub))) return unauthorized(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON を読み取れません' } },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const messages = (Array.isArray(body) ? body : [body]) as JsonRpcRequest[];
  const responses = (await Promise.all(messages.map((m) => handle(m, token.sub)))).filter(Boolean);

  if (responses.length === 0) return new NextResponse(null, { status: 202, headers: CORS_HEADERS });
  return NextResponse.json(Array.isArray(body) ? responses : responses[0], { headers: CORS_HEADERS });
}

// サーバーからのストリーム (SSE) は使わない
export async function GET() {
  return new NextResponse(null, { status: 405, headers: { ...CORS_HEADERS, Allow: 'POST' } });
}

export async function DELETE() {
  return new NextResponse(null, { status: 405, headers: { ...CORS_HEADERS, Allow: 'POST' } });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
