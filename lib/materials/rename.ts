import { supabase } from '@/lib/supabase';

export async function renameMaterial(materialId: string, title: string): Promise<string> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error('教材名を入力してください。');
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('ログインしてください。');
  const { data, error } = await supabase.from('materials')
    .update({ title: trimmed }).eq('id', materialId).eq('student_id', user.id)
    .select('id, title').single();
  if (error || !data) throw new Error('教材名を保存できませんでした。再試行してください。');
  return data.title;
}
