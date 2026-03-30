'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Briefcase, ChevronRight, CheckCircle2 } from 'lucide-react';
import { supabase } from "../../lib/supabase"; // 🌟 ここをあなたの環境に合わせて修正！

export default function OnboardingPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // フォームの状態
  const [formData, setFormData] = useState({
    real_name: '',
    nickname: '',
    age: '',
    user_type: 'student', // 初期値は学生
    university: '',
    grade: '',
    occupation: '',
  });

  // ログイン中のユーザーIDを取得
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUserId(user.id);
        // すでに設定済みの場合はトップページへ飛ばす
        const { data } = await supabase.from('profiles').select('is_setup_completed, nickname').eq('id', user.id).single();
        if (data?.is_setup_completed) router.push('/');
        if (data?.nickname) setFormData(prev => ({ ...prev, nickname: data.nickname }));
      }
    };
    getUser();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setLoading(true);

    try {
      // データベースを更新して、is_setup_completed を true にする
      const { error } = await supabase
        .from('profiles')
        .update({
          real_name: formData.real_name,
          nickname: formData.nickname,
          age: formData.age,
          user_type: formData.user_type,
          university: formData.user_type === 'student' ? formData.university : null,
          grade: formData.user_type === 'student' ? formData.grade : null,
          occupation: formData.user_type === 'worker' ? formData.occupation : null,
          is_setup_completed: true, 
        })
        .eq('id', userId);

      if (error) throw error;
      
      // 成功したらアプリのトップ画面へGO
      router.push('/');
      
    } catch (error) {
      console.error('更新エラー:', error);
      alert('エラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white dark:bg-[#1c1c1e] rounded-3xl shadow-xl border border-slate-100 dark:border-[#2c2c2e] overflow-hidden">
        
        {/* ヘッダー部分 */}
        <div className="bg-indigo-600 p-8 text-center">
          <h1 className="text-2xl font-black text-white mb-2 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-6 h-6" /> Welcome to Studia!
          </h1>
          <p className="text-indigo-100 text-sm font-bold">アプリを始める前に、あなたのことを少しだけ教えてください。</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* --- 共通項目 --- */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-500 mb-1">本名 (実名) <span className="text-red-500">*</span></label>
              <p className="text-[10px] text-slate-400 mb-2">※アプリ内では公開されません</p>
              <input required type="text" name="real_name" value={formData.real_name} onChange={handleChange} className="w-full p-3 bg-slate-50 dark:bg-[#2c2c2e]/50 border border-slate-200 dark:border-[#38383a] rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500" placeholder="山田 太郎" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-500 mb-1">ニックネーム <span className="text-red-500">*</span></label>
                <p className="text-[10px] text-slate-400 mb-2">※アプリ内で表示されます</p>
                <input required type="text" name="nickname" value={formData.nickname} onChange={handleChange} className="w-full p-3 bg-slate-50 dark:bg-[#2c2c2e]/50 border border-slate-200 dark:border-[#38383a] rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500" placeholder="たろー" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 mb-1">年齢 <span className="text-red-500">*</span></label>
                <p className="text-[10px] text-slate-400 mb-2">※同世代の仲間を見つけやすくします</p>
                <input required type="number" name="age" value={formData.age} onChange={handleChange} className="w-full p-3 bg-slate-50 dark:bg-[#2c2c2e]/50 border border-slate-200 dark:border-[#38383a] rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500" placeholder="20" min="10" max="100" />
              </div>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-[#2c2c2e]" />

          {/* --- 属性選択 (学生 or 社会人) --- */}
          <div>
            <label className="block text-xs font-black text-slate-500 mb-3">現在のステータス <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-4">
              <label className={`cursor-pointer flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${formData.user_type === 'student' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-100 dark:border-[#38383a] hover:border-indigo-200'}`}>
                <input type="radio" name="user_type" value="student" checked={formData.user_type === 'student'} onChange={handleChange} className="hidden" />
                <GraduationCap className={`w-8 h-8 ${formData.user_type === 'student' ? 'text-indigo-500' : 'text-slate-400'}`} />
                <span className={`text-sm font-bold ${formData.user_type === 'student' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-500'}`}>学生</span>
              </label>
              
              <label className={`cursor-pointer flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${formData.user_type === 'worker' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-100 dark:border-[#38383a] hover:border-emerald-200'}`}>
                <input type="radio" name="user_type" value="worker" checked={formData.user_type === 'worker'} onChange={handleChange} className="hidden" />
                <Briefcase className={`w-8 h-8 ${formData.user_type === 'worker' ? 'text-emerald-500' : 'text-slate-400'}`} />
                <span className={`text-sm font-bold ${formData.user_type === 'worker' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>社会人・その他</span>
              </label>
            </div>
          </div>

          {/* --- 学生専用の入力欄 --- */}
          {formData.user_type === 'student' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
              <div>
                <label className="block text-xs font-black text-slate-500 mb-2">所属大学 / 学校名 <span className="text-red-500">*</span></label>
                <input required type="text" name="university" value={formData.university} onChange={handleChange} className="w-full p-3 bg-slate-50 dark:bg-[#2c2c2e]/50 border border-slate-200 dark:border-[#38383a] rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500" placeholder="〇〇大学" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 mb-2">学年 <span className="text-red-500">*</span></label>
                <select required name="grade" value={formData.grade} onChange={handleChange} className="w-full p-3 bg-slate-50 dark:bg-[#2c2c2e]/50 border border-slate-200 dark:border-[#38383a] rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500 cursor-pointer">
                  <option value="">選択してください</option>
                  <option value="大学1年生">大学1年生</option>
                  <option value="大学2年生">大学2年生</option>
                  <option value="大学3年生">大学3年生</option>
                  <option value="大学4年生">大学4年生</option>
                  <option value="大学院生">大学院生</option>
                  <option value="その他学生">その他学生</option>
                </select>
              </div>
            </div>
          )}

          {/* --- 社会人専用の入力欄 --- */}
          {formData.user_type === 'worker' && (
            <div className="animate-in fade-in slide-in-from-top-4">
              <label className="block text-xs font-black text-slate-500 mb-2">職業・属性 <span className="text-red-500">*</span></label>
              <input required type="text" name="occupation" value={formData.occupation} onChange={handleChange} className="w-full p-3 bg-slate-50 dark:bg-[#2c2c2e]/50 border border-slate-200 dark:border-[#38383a] rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-500" placeholder="例：ITエンジニア、弁護士、公務員など" />
            </div>
          )}

          <div className="pt-4">
            <button disabled={loading} type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm transition-all flex justify-center items-center gap-2 disabled:opacity-50">
              {loading ? '保存中...' : 'プロフィールを登録して始める'} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}