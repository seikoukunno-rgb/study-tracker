'use server'

// app/actions の2つ上の階層にある utils を指定します
import { createClient } from '../utils/supabase/server';
import { revalidatePath } from 'next/cache';

// 権限を変更するアクション
export async function toggleAdminRole(targetUserId: string, newRole: 'admin' | 'user') {
  const supabase = await createClient(); // 🌟 await 必須
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('ログインしていません。');
  }

  // 本人が管理者かどうかの厳格なチェック
  const { data: requester } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (requester?.role !== 'admin') {
    throw new Error('不正なアクセスです。');
  }

  // 最後の管理者の降格防止
  if (newRole === 'user') {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');
      
    if (count !== null && count <= 1) {
      throw new Error('最後の管理者は降格できません。');
    }
  }

  // 権限の更新
  await supabase.from('profiles').update({ role: newRole }).eq('id', targetUserId);
  
  // 管理画面をリフレッシュして最新状態にする
  revalidatePath('/admin');
}