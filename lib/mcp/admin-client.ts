// サーバー専用: service role で Supabase に接続するクライアント。
// ブラウザ側のコードからは絶対に import しないこと。
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase のサーバー用環境変数が設定されていません');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// コネクタを使えるのは管理者 (現時点ではあなた本人) だけ
export async function isAllowedUser(userId: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  return data?.role === 'admin';
}
