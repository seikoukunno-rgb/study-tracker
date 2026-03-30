'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Briefcase, ChevronRight, CheckCircle2, Search } from 'lucide-react';
import { supabase } from "../../lib/supabase"; 

// 🌟 究極の裏技：アプリ内蔵の大学リスト（爆速・オフライン動作・エラーゼロ）
// ※主要な国公立・私立を網羅しています。必要に応じていつでも追加可能です。
const UNIVERSITIES = [
  "東京大学", "京都大学", "大阪大学", "北海道大学", "東北大学", "名古屋大学", "九州大学",
  "筑波大学", "神戸大学", "横浜国立大学", "千葉大学", "広島大学", "岡山大学", "金沢大学", "熊本大学",
  "新潟大学", "静岡大学", "東京工業大学", "一橋大学", "東京医科歯科大学", "東京外国語大学", "東京農工大学",
  "お茶の水女子大学", "電気通信大学", "名古屋工業大学", "京都工芸繊維大学", "九州工業大学",
  "慶應義塾大学", "早稲田大学", "上智大学", "東京理科大学", "国際基督教大学",
  "明治大学", "青山学院大学", "立教大学", "中央大学", "法政大学", "学習院大学",
  "関西大学", "関西学院大学", "同志社大学", "立命館大学",
  "日本大学", "東洋大学", "駒澤大学", "専修大学", "近畿大学", "龍谷大学", "甲南大学", "京都産業大学",
  "成蹊大学", "成城大学", "明治学院大学", "國學院大学", "武蔵大学", "獨協大学",
  "芝浦工業大学", "東京電機大学", "工学院大学", "豊洲工業大学", "大阪工業大学",
  "南山大学", "中京大学", "名城大学", "愛知大学", "福岡大学", "西南学院大学",
  // --- 以下に専門学校や短大を自由に追加できます ---
  "HAL東京", "日本電子専門学校", "モード学園", "大原簿記学校", "バンタンデザイン研究所"
];

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [showUniDropdown, setShowUniDropdown] = useState(false);

  // フォームの状態
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    lastNameKana: '',
    firstNameKana: '',
    nickname: '',
    age: '',
    user_type: 'student', 
    university: '',
    grade: '',
    occupation: '',
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUserId(user.id);
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
      const fullName = `${formData.lastName} ${formData.firstName}`;

      const { error } = await supabase
        .from('profiles')
        .update({
          real_name: fullName,
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
      router.push('/');
      
    } catch (error) {
      console.error('更新エラー:', error);
      alert('エラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  // 🌟 通信不要の爆速フィルター処理（入力された文字が含まれる大学を10件だけ抽出）
  const filteredUnis = formData.university.trim() === '' 
    ? [] 
    : UNIVERSITIES.filter(uni => uni.includes(formData.university)).slice(0, 10);

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-50 dark:bg-black overflow-y-auto flex items-start sm:items-center justify-center p-4 py-10">
      <div className="w-full max-w-xl bg-white dark:bg-[#1c1c1e] rounded-3xl shadow-2xl border border-slate-100 dark:border-[#2c2c2e] overflow-hidden my-auto">
        
        {/* ヘッダー部分 */}
        <div className="bg-indigo-600 p-8 text-center">
          <h1 className="text-2xl font-black text-white mb-2 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-6 h-6" /> Welcome to Studia!
          </h1>
          <p className="text-indigo-100 text-sm font-bold">アプリを始める前に、あなたのことを少しだけ教えてください。</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* --- 本名入力 --- */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-black text-slate-800 dark:text-white">お名前</label>
              <span className="text-[10px] font-bold text-slate-400">※アプリ内では公開されません</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1">姓 <span className="text-red-500">*</span></label>
                <input required type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full p-3 bg-slate-50 dark:bg-[#2c2c2e]/50 border border-slate-200 dark:border-[#38383a] rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500" placeholder="山田" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1">名 <span className="text-red-500">*</span></label>
                <input required type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full p-3 bg-slate-50 dark:bg-[#2c2c2e]/50 border border-slate-200 dark:border-[#38383a] rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500" placeholder="太郎" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1">セイ <span className="text-red-500">*</span></label>
                <input required type="text" name="lastNameKana" value={formData.lastNameKana} onChange={handleChange} className="w-full p-3 bg-slate-50 dark:bg-[#2c2c2e]/50 border border-slate-200 dark:border-[#38383a] rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500" placeholder="ヤマダ" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1">メイ <span className="text-red-500">*</span></label>
                <input required type="text" name="firstNameKana" value={formData.firstNameKana} onChange={handleChange} className="w-full p-3 bg-slate-50 dark:bg-[#2c2c2e]/50 border border-slate-200 dark:border-[#38383a] rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500" placeholder="タロウ" />
              </div>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-[#2c2c2e]" />

          {/* --- ニックネーム & 年齢 --- */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-500 mb-1">ニックネーム <span className="text-red-500">*</span></label>
              <p className="text-[9px] text-slate-400 mb-2">※アプリ内で表示されます</p>
              <input required type="text" name="nickname" value={formData.nickname} onChange={handleChange} className="w-full p-3 bg-slate-50 dark:bg-[#2c2c2e]/50 border border-slate-200 dark:border-[#38383a] rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500" placeholder="たろー" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 mb-1">年齢 <span className="text-red-500">*</span></label>
              <p className="text-[9px] text-slate-400 mb-2">※同世代の仲間を見つけやすくします</p>
              <input required type="number" name="age" value={formData.age} onChange={handleChange} className="w-full p-3 bg-slate-50 dark:bg-[#2c2c2e]/50 border border-slate-200 dark:border-[#38383a] rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500" placeholder="20" min="10" max="100" />
            </div>
          </div>

          <hr className="border-slate-100 dark:border-[#2c2c2e]" />

          {/* --- 属性選択 --- */}
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
              <div className="relative">
                <label className="block text-xs font-black text-slate-500 mb-2">所属大学 / 学校名 <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required 
                    type="text" 
                    name="university" 
                    value={formData.university} 
                    onChange={(e) => { handleChange(e); setShowUniDropdown(true); }} 
                    onFocus={() => setShowUniDropdown(true)}
                    onBlur={() => setTimeout(() => setShowUniDropdown(false), 200)}
                    className="w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-[#2c2c2e]/50 border border-slate-200 dark:border-[#38383a] rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500" 
                    placeholder="大学名を検索、または直接入力" 
                  />
                </div>
                
                {/* 🌟 爆速サジェスト機能（通信なし） */}
                {showUniDropdown && formData.university && (
                  <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-[#38383a] rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {filteredUnis.length > 0 ? (
                      filteredUnis.map(uni => (
                        <li 
                          key={uni} 
                          onMouseDown={(e) => e.preventDefault()} 
                          onClick={() => {
                            setFormData({...formData, university: uni});
                            setShowUniDropdown(false);
                          }} 
                          className="p-3 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 cursor-pointer text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors"
                        >
                          {uni}
                        </li>
                      ))
                    ) : (
                      <li className="p-3 text-sm font-bold text-slate-400 text-center">
                        候補が見つかりません（そのまま登録可能です）
                      </li>
                    )}
                  </ul>
                )}
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
                  <option value="専門学生">専門学生</option>
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

          <div className="pt-4 pb-8">
            <button disabled={loading} type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-500/30 transition-all flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50">
              {loading ? '保存中...' : 'プロフィールを登録して始める'} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}