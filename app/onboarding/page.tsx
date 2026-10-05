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
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

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
    <>
    <div className="fixed inset-0 z-[9999] bg-slate-50 dark:bg-black overflow-y-auto flex items-start sm:items-center justify-center p-4 py-10">
      <div className="w-full max-w-xl bg-white dark:bg-[#1c1c1e] rounded-3xl shadow-2xl border border-slate-100 dark:border-[#2c2c2e] overflow-hidden my-auto">
        
        {/* ヘッダー部分 */}
        <div className="bg-indigo-600 p-8 text-center">
          <h1 className="text-2xl font-black text-white mb-2 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-6 h-6" /> Welcome to Mercury!
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

          {/* --- 利用規約・プライバシーポリシー同意 --- */}
          <div className="space-y-3 bg-slate-50 dark:bg-[#2c2c2e]/50 rounded-2xl p-4 border border-slate-100 dark:border-[#38383a]">
            <p className="text-xs font-black text-slate-500 dark:text-slate-400 mb-3">ご利用前にご確認ください</p>
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${agreedTerms ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'}`}
                onClick={() => setAgreedTerms(v => !v)}>
                {agreedTerms && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                <button type="button" onClick={() => setShowTermsModal(true)} className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:text-indigo-800">利用規約</button>
                を読み、同意します
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${agreedPrivacy ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'}`}
                onClick={() => setAgreedPrivacy(v => !v)}>
                {agreedPrivacy && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                <button type="button" onClick={() => setShowPrivacyModal(true)} className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:text-indigo-800">プライバシーポリシー</button>
                を読み、同意します
              </span>
            </label>
          </div>

          <div className="pt-4 pb-8">
            <button disabled={loading || !agreedTerms || !agreedPrivacy} type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-500/30 transition-all flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? '保存中...' : 'プロフィールを登録して始める'} <ChevronRight className="w-4 h-4" />
            </button>
            {(!agreedTerms || !agreedPrivacy) && (
              <p className="text-center text-xs text-slate-400 mt-2">利用規約とプライバシーポリシーへの同意が必要です</p>
            )}
          </div>
        </form>
      </div>
    </div>

    {/* 利用規約モーダル */}
    {showTermsModal && (
      <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowTermsModal(false)}>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-[#2c2c2e] flex-shrink-0">
            <h2 className="text-base font-black">Mercury 利用規約</h2>
            <button type="button" onClick={() => setShowTermsModal(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-5 text-xs text-slate-600 dark:text-slate-300 space-y-4 leading-relaxed">
            <p className="text-slate-400">制定日：2026年10月5日</p>
            <p><strong>第1条（適用）</strong><br/>1. 本利用規約（以下「本規約」という。）は、運営者が提供する学習管理アプリ「Mercury」（以下「本アプリ」という。）の利用条件を定めるものである。<br/>2. 本規約は、本アプリを利用するすべての者（以下「ユーザー」という。）に適用される。<br/>3. 運営者が本アプリ上で別途定める注意事項、ガイドラインその他の規定は、本規約の一部を構成する。本規約と矛盾する場合は、当該規定が優先する。</p>
            <p><strong>第2条（利用の開始）</strong><br/>1. ユーザーは、Googleアカウントでログインし、本規約に同意したうえで、本アプリの利用を開始するものとする。<br/>2. ログインして利用を開始した時点で、ユーザーは本規約に同意したものとみなす。<br/>3. 未成年者は、保護者の同意を得たうえで利用すること。</p>
            <p><strong>第3条（サービス内容）</strong><br/>本アプリは、次の機能を基本無料で提供する。(1) PDFの閲覧、書き込み、注釈、検索 (2) 学習時間・学習内容の記録、および学習状況のグラフ表示 (3) 課題・やるべきことの管理（Todo） (4) 学習時間に応じたレベルアップ等の機能 (5) 学習時間ランキング（すたらん）、ルーム、フォロワーなど、他のユーザーと交流する機能 (6) ユーザーが許可した場合のGoogleドライブとの連携 (7) その他、運営者が追加する機能</p>
            <p><strong>第4条（利用料金）</strong><br/>本アプリは基本無料で提供する。ただし、運営者が一部の機能を有料とする場合は、事前にその内容および料金を本アプリまたはウェブサイト上で知らせる。</p>
            <p><strong>第5条（アカウントの管理）</strong><br/>ユーザーは、自己のGoogleアカウントおよび端末を、自己の責任で管理するものとする。</p>
            <p><strong>第6条（Googleアカウントおよび外部サービスとの連携）</strong><br/>1. 本アプリは、ユーザーが許可した範囲でのみ、Googleアカウントの情報（メールアドレス、氏名、プロフィール画像）およびGoogleドライブ上の、ユーザーが選択したファイルを利用する。<br/>2. ユーザーは、Googleアカウントの設定画面から、いつでも本アプリへの許可を取り消すことができる。<br/>3. 運営者は、Google、Supabase、Vercelなどの外部サービスを利用して本アプリを運営している。外部サービスの利用条件は、各提供者の定めるところによる。</p>
            <p><strong>第7条（禁止事項）</strong><br/>ユーザーは、次の行為をしてはならない。(1) 法令または公序良俗に違反する行為 (2) 本アプリのサーバーやネットワークに過度な負荷をかける行為 (3) 不正アクセス、またはその試み (4) 本アプリのスクレイピング、リバースエンジニアリング、その他の方法による解析 (5) 他者の権利（知的財産権、プライバシー、名誉など）を侵害する行為 (6) 本アプリの交流機能（ランキング、ルーム、フォロワー等）を通じて、他のユーザーに嫌がらせをし、または迷惑をかける行為 (7) 本アプリを、運営者が意図しない方法で利用し、または第三者に不正に利用させる行為 (8) 虚偽の学習記録を登録するなど、他のユーザーを欺く行為 (9) その他、運営者が不適切と判断する行為</p>
            <p><strong>第8条（知的財産権）</strong><br/>本アプリおよびこれに付随する一切のコンテンツに関する知的財産権は、運営者または正当な権利者に帰属する。ユーザーは、これらを運営者の許可なく複製、転載、再配布してはならない。</p>
            <p><strong>第9条（ユーザーのデータおよび公開される情報）</strong><br/>1. ユーザーが本アプリに登録した学習記録その他のデータ（以下「ユーザーデータ」という。）の権利は、ユーザーに帰属する。<br/>2. 運営者は、本アプリの提供・維持・改善に必要な範囲でのみ、ユーザーデータを利用する。<br/>3. ランキング、ルーム、フォロワーなどの交流機能では、ユーザー名、学習時間その他の情報が、他のユーザーに表示される場合がある。ユーザーは、これに同意のうえ利用するものとする。<br/>4. ユーザーデータの取扱いは、別に定めるプライバシーポリシーに従う。</p>
            <p><strong>第10条（データの保存）</strong><br/>運営者は、ユーザーデータの保存に努めるが、その消失・破損が生じないことを保証しない。重要なデータは、ユーザー自身でも控えを取ること。</p>
            <p><strong>第11条（サービスの変更・中断・終了）</strong><br/>1. 運営者は、保守、障害、不可抗力その他の事情により、事前の通知なく本アプリの全部または一部を中断することがある。<br/>2. 運営者は、必要に応じて、本アプリの内容を変更し、または提供を終了することがある。終了する場合は、可能な限り事前に本アプリまたはウェブサイト上で知らせる。</p>
            <p><strong>第12条（利用の停止および退会）</strong><br/>1. 運営者は、ユーザーが本規約に違反した場合、事前の通知なく、そのユーザーの利用を停止することがある。<br/>2. ユーザーは、第17条の連絡先に申し出ることにより、いつでも退会し、自己のデータの削除を求めることができる。</p>
            <p><strong>第13条（免責）</strong><br/>1. 本アプリは現状有姿で提供する。運営者は、本アプリの正確性、有用性、継続性、エラーがないことについて保証しない。<br/>2. 本アプリの利用により学習の成果が得られることを、運営者は保証しない。<br/>3. 交流機能を通じたユーザー間のトラブルについて、運営者は責任を負わない。ただし、運営者が必要と判断した場合は、対応を行うことがある。<br/>4. 本アプリの中断、変更、終了、またはユーザーデータの消失・破損によってユーザーに生じた損害について、運営者は責任を負わない。<br/>5. 運営者に故意または重大な過失がある場合には、本条および次条の免責・責任制限は適用されない。</p>
            <p><strong>第14条（責任の制限）</strong><br/>運営者がユーザーに対して損害賠償責任を負う場合でも、その範囲は、ユーザーに現実に生じた通常の直接損害に限る。</p>
            <p><strong>第15条（規約の変更）</strong><br/>1. 運営者は、必要に応じて本規約を変更することがある。<br/>2. 変更後の規約は、本アプリまたはウェブサイトに掲載した時点から効力を生じる。重要な変更を行う場合は、掲載を通じて事前に知らせる。<br/>3. 変更後に本アプリを利用した場合、ユーザーは変更後の規約に同意したものとみなす。</p>
            <p><strong>第16条（準拠法・管轄）</strong><br/>本規約は日本法に準拠する。本アプリに関して紛争が生じた場合は、民事訴訟法に定める管轄裁判所を第一審の裁判所とする。</p>
            <p><strong>第17条（連絡先）</strong><br/>本規約および本アプリに関する問い合わせは、次の連絡先に行うこと。運営者：Mercury運営局／メール：admin.mercury@gmail.com</p>
          </div>
          <div className="p-4 border-t border-slate-100 dark:border-[#2c2c2e] flex-shrink-0">
            <button type="button" onClick={() => { setAgreedTerms(true); setShowTermsModal(false); }} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm transition-all active:scale-95">
              読んで同意する
            </button>
          </div>
        </div>
      </div>
    )}

    {/* プライバシーポリシーモーダル */}
    {showPrivacyModal && (
      <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowPrivacyModal(false)}>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-[#2c2c2e] flex-shrink-0">
            <h2 className="text-base font-black">Mercury プライバシーポリシー</h2>
            <button type="button" onClick={() => setShowPrivacyModal(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-5 text-xs text-slate-600 dark:text-slate-300 space-y-4 leading-relaxed">
            <p className="text-slate-400">制定日：2026年10月5日</p>
            <p>Mercury運営局（以下「運営者」という。）は、学習管理アプリ「Mercury」（以下「本アプリ」という。）におけるユーザーの個人情報およびデータの取扱いについて、本プライバシーポリシー（以下「本ポリシー」という。）を定める。</p>
            <p><strong>第1条（基本方針）</strong><br/>運営者は、個人情報の保護に関する法律その他の関連法令、およびGoogle API Services User Data Policy（Limited Use の要件を含む。）を遵守し、必要な範囲で適正に個人情報を取り扱う。</p>
            <p><strong>第2条（取得する情報）</strong><br/>運営者は、次の情報を取得する。1. Googleアカウントの情報：ユーザーがGoogleアカウントでログインする際に、メールアドレス、氏名、プロフィール画像を取得する。2. ユーザーが本アプリに登録する情報：学習記録、学習時間、Todo、ルームやフォロワーに関する情報、設定情報など、ユーザーが本アプリ上で作成・登録する情報。3. Googleドライブに関する情報：ユーザーがGoogleドライブ連携を許可し、ファイルを選択した場合に、そのファイルを表示するためのアクセス情報。4. 技術情報：本アプリの提供および不具合の把握のために、アクセス日時、利用環境などの情報を取得する場合がある。</p>
            <p><strong>第3条（Googleユーザーデータの取扱い）</strong><br/>1. 利用目的の限定：本アプリが取得するGoogleユーザーデータ（メールアドレス、氏名、プロフィール画像、およびユーザーが選択したGoogleドライブ上のファイル）は、(1) ユーザーの認証およびアカウントの識別、(2) ユーザーが選択したGoogleドライブ上のファイルを本アプリ内で表示すること、の目的にのみ利用する。2. Limited Use の遵守：運営者は、Googleユーザーデータを、広告、独自のAI・機械学習モデルの学習、または運営者もしくは第三者の別目的のために利用しない。3. Googleドライブのファイルについて：本アプリは、ユーザーが選択したGoogleドライブ上のファイルを表示するのみであり、その内容を運営者のサーバーに保存しない。4. 権限の範囲：本アプリは、ユーザーがGoogleドライブで選択したファイルにのみアクセスし、ドライブ内のその他のファイルにはアクセスしない。5. 連携の解除：ユーザーは、Googleアカウントのセキュリティ設定（https://myaccount.google.com/permissions）から、いつでも本アプリへの連携を解除できる。</p>
            <p><strong>第4条（情報の保存先）</strong><br/>1. ユーザーのログイン情報および学習データは、Supabase, Inc.（以下「Supabase」という。）の提供するデータベース（東京リージョン）に保存される。2. 本アプリは、Vercel, Inc.（以下「Vercel」という。）のプラットフォーム上で提供される。3. Googleドライブ上のファイルの内容は、運営者のサーバーに保存されない。</p>
            <p><strong>第5条（利用目的）</strong><br/>運営者は、取得した情報を次の目的で利用する。(1) 本アプリの提供、維持、および改善 (2) ユーザーの認証およびアカウントの管理 (3) 学習記録の保存および表示 (4) ランキング、ルーム、フォロワーなどの交流機能の提供 (5) 不正利用の防止および対応 (6) ユーザーからの問い合わせへの対応。運営者は、上記の目的の範囲を超えて情報を利用しない。</p>
            <p><strong>第6条（他のユーザーに表示される情報）</strong><br/>本アプリの交流機能（ランキング、ルーム、フォロワーなど）では、ユーザー名、学習時間その他の一部の情報が、他のユーザーに表示される。ユーザーは、これを理解したうえで当該機能を利用するものとする。メールアドレスは、他のユーザーに表示されない。</p>
            <p><strong>第7条（第三者提供）</strong><br/>運営者は、(1) ユーザーの同意がある場合、(2) 法令に基づく場合、(3) 人の生命、身体または財産の保護のために必要であって、本人の同意を得ることが困難な場合、を除き、個人情報を第三者に提供しない。</p>
            <p><strong>第8条（外部サービスの利用）</strong><br/>運営者は、本アプリの運営のために、前条にかかわらず、Google、Supabase、Vercelなどの外部サービスを利用する。これらのサービスにおける情報の取扱いは、各提供者の定めるプライバシーポリシーに従う。</p>
            <p><strong>第9条（データの保存期間）</strong><br/>運営者は、利用目的の達成に必要な期間、情報を保存する。ユーザーが退会した場合、または削除の求めがあった場合は、法令で保存が義務付けられている場合を除き、その情報を速やかに削除する。</p>
            <p><strong>第10条（安全管理措置）</strong><br/>運営者は、情報の漏えい、滅失または毀損を防ぐため、通信の暗号化（HTTPS）、アクセス制御などの措置を講じる。ただし、インターネットを通じた情報の送受信において、完全な安全性を保証するものではない。</p>
            <p><strong>第11条（ユーザーの権利）</strong><br/>ユーザーは、自己の個人情報について、開示、訂正、利用停止、削除を求めることができる。これらを希望する場合は、第13条の連絡先に申し出ること。運営者は、本人からの求めであることを確認のうえ、適切に対応する。</p>
            <p><strong>第12条（本ポリシーの変更）</strong><br/>1. 運営者は、必要に応じて本ポリシーを変更することがある。2. 変更後の本ポリシーは、本アプリまたはウェブサイトに掲載した時点から効力を生じる。重要な変更を行う場合は、掲載を通じて事前に知らせる。</p>
            <p><strong>第13条（連絡先）</strong><br/>本ポリシーおよび個人情報の取扱いに関する問い合わせは、次の連絡先に行うこと。運営者：Mercury運営局／メール：admin.mercury@gmail.com</p>
          </div>
          <div className="p-4 border-t border-slate-100 dark:border-[#2c2c2e] flex-shrink-0">
            <button type="button" onClick={() => { setAgreedPrivacy(true); setShowPrivacyModal(false); }} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm transition-all active:scale-95">
              読んで同意する
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}