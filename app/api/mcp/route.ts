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
    name: 'add_study_log',
    description:
      '自分の学習記録を1件追加する (アプリの「記録」と同じ)。教材は名前の一部か ID で指定でき、省略すると教材なしで記録する。',
    inputSchema: {
      type: 'object',
      properties: {
        minutes: { type: 'number', description: '学習時間 (分)。1〜1440。' },
        material: { type: 'string', description: '教材の名前の一部、または教材ID。省略可。' },
        date: { type: 'string', description: '学習した日 (YYYY-MM-DD)。省略時は今日(日本時間)。' },
        memo: { type: 'string', description: '感想・メモ。省略可。' },
      },
      required: ['minutes'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
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
    description:
      'Mercury のカレンダーにある自分のTodo(タスク・試験)を日付順に返す。ユーザーがアプリで追加したものも含む。' +
      '既定では日付に関係なく未完了のものをすべて返し、期限切れには印を付ける。Todoについて答える前に必ずこれで最新の状態を確認する。',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'この日付 (YYYY-MM-DD) 以降に絞る。省略可。' },
        to: { type: 'string', description: 'この日付 (YYYY-MM-DD) 以前に絞る。省略可。' },
        include_completed: { type: 'boolean', description: '完了済みも含めるなら true。既定 false。' },
        limit: { type: 'number', description: '最大件数 (既定100、最大300)。' },
      },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'add_todo',
    description: 'Mercury のカレンダー(Todoリスト)に、自分のTodoを1件追加する。',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Todoの内容。' },
        date: { type: 'string', description: '予定日 (YYYY-MM-DD)。省略時は今日(日本時間)。' },
        type: { type: 'string', enum: ['task', 'exam'], description: 'task=タスク(既定)、exam=試験。' },
        notify_at: {
          type: 'string',
          description: '通知日時 (ISO 8601、例 2026-10-25T09:00:00+09:00)。通知が要らなければ省略。',
        },
      },
      required: ['title'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: 'complete_todo',
    description: '自分のTodoを完了(または未完了に戻す)にする。id は list_todos で確認する。',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'TodoのID。' },
        completed: { type: 'boolean', description: '完了にするなら true(既定)、戻すなら false。' },
      },
      required: ['id'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 日本時間の今日 (YYYY-MM-DD)
function todayJst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());
}

function formatTodo(e: { id: string; date: string; title: string; event_type: string; is_completed: boolean; notify_time: string | null }) {
  return {
    id: e.id,
    日付: e.date,
    内容: e.title,
    種類: e.event_type === 'exam' ? '試験' : 'タスク',
    完了: e.is_completed,
    期限切れ: !e.is_completed && e.date < todayJst(),
    通知: e.notify_time ?? 'なし',
  };
}

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 自分の教材を ID か名前の一部で探す。見つからない・候補が複数ならエラーで候補を返す
async function resolveMaterial(query: string, uid: string): Promise<{ id: string; title: string } | null> {
  if (!query) return null;
  const { data, error } = await createAdminClient()
    .from('materials')
    .select('id, title')
    .eq('student_id', uid)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const mats = data ?? [];

  if (UUID_RE.test(query)) {
    const byId = mats.find((m) => m.id === query);
    if (byId) return byId;
  }
  // 同じ名前の教材が複数あるときは、新しく登録した方を使う
  const q = query.toLowerCase();
  const exact = mats.filter((m) => (m.title ?? '').toLowerCase() === q);
  if (exact.length >= 1) return exact[0];
  const partial = mats.filter((m) => (m.title ?? '').toLowerCase().includes(q));
  if (partial.length >= 1 && new Set(partial.map((m) => m.title)).size === 1) return partial[0];

  const titles = [...new Set((partial.length ? partial : mats).map((m) => m.title))].slice(0, 15);
  throw new Error(
    partial.length
      ? `「${query}」に当てはまる教材が複数あります。どれか指定してください: ${titles.join(' / ')}`
      : `「${query}」という教材が見つかりません。教材一覧: ${titles.join(' / ')}`
  );
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

    case 'add_study_log': {
      const minutes = Math.round(Number(args.minutes));
      if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) {
        throw new Error('minutes は 1〜1440 の分数で指定してください');
      }
      const date = typeof args.date === 'string' && args.date ? args.date : todayJst();
      if (!DATE_RE.test(date)) throw new Error('date は YYYY-MM-DD 形式で指定してください');

      const material = await resolveMaterial(typeof args.material === 'string' ? args.material.trim() : '', uid);
      const { data, error } = await db
        .from('study_logs')
        .insert([
          {
            student_id: uid,
            material_id: material?.id ?? null,
            duration_minutes: minutes,
            thoughts: typeof args.memo === 'string' ? args.memo : '',
            studied_at: date,
          },
        ])
        .select('studied_at, duration_minutes, thoughts')
        .single();
      if (error) throw error;
      return {
        結果: '学習記録を追加しました',
        日付: data.studied_at,
        分: data.duration_minutes,
        教材: material?.title ?? '(教材なし)',
        感想: data.thoughts ?? '',
      };
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
      let q = db
        .from('calendar_events')
        .select('id, date, title, event_type, is_completed, notify_time')
        .eq('student_id', uid)
        .order('date', { ascending: true })
        .limit(clampNumber(args.limit, 100, 300));
      if (typeof args.from === 'string' && DATE_RE.test(args.from)) q = q.gte('date', args.from);
      if (typeof args.to === 'string' && DATE_RE.test(args.to)) q = q.lte('date', args.to);
      if (args.include_completed !== true) q = q.eq('is_completed', false);
      const { data, error } = await q;
      if (error) throw error;
      const todos = (data ?? []).map(formatTodo);
      return {
        今日: todayJst(),
        件数: todos.length,
        期限切れ件数: todos.filter((t) => t.期限切れ).length,
        Todo: todos,
      };
    }

    case 'add_todo': {
      const title = typeof args.title === 'string' ? args.title.trim() : '';
      if (!title) throw new Error('title は必須です');
      const date = typeof args.date === 'string' && args.date ? args.date : todayJst();
      if (!DATE_RE.test(date)) throw new Error('date は YYYY-MM-DD 形式で指定してください');
      let notifyTime: string | null = null;
      if (typeof args.notify_at === 'string' && args.notify_at) {
        const t = new Date(args.notify_at);
        if (Number.isNaN(t.getTime())) throw new Error('notify_at の日時を読み取れません');
        notifyTime = t.toISOString();
      }
      const { data, error } = await db
        .from('calendar_events')
        .insert([
          {
            student_id: uid,
            date,
            title,
            event_type: args.type === 'exam' ? 'exam' : 'task',
            is_completed: false,
            notify_time: notifyTime,
          },
        ])
        .select('id, date, title, event_type, is_completed, notify_time')
        .single();
      if (error) throw error;
      return { 結果: 'Todoに追加しました', ...formatTodo(data) };
    }

    case 'complete_todo': {
      const id = typeof args.id === 'string' ? args.id : '';
      if (!id) throw new Error('id は必須です');
      const { data, error } = await db
        .from('calendar_events')
        .update({ is_completed: args.completed !== false })
        .eq('id', id)
        .eq('student_id', uid)
        .select('id, date, title, event_type, is_completed, notify_time')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('そのIDのTodoが見つかりません');
      return { 結果: data.is_completed ? '完了にしました' : '未完了に戻しました', ...formatTodo(data) };
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
        instructions:
          'Mercury (学習管理アプリ) の、ログイン中ユーザー本人の学習記録・教材・ノート・Todo を扱います。Todo は Mercury のカレンダーに表示されます。日付は日本時間で扱ってください。',
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
