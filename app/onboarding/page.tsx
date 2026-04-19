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
            <p><strong>第1条（適用および規約の構成）</strong><br/>本利用規約（以下「本規約」）は、当開発者が提供するアプリケーション「Mercury」（以下「本アプリ」）の利用条件を定めるものです。本規約は、本アプリの利用に関する当開発者とユーザーとの間の一切の関係に適用されます。当開発者は、ガイドライン・ポリシー・ヘルプページその他の規定（以下「個別規定」）を定めることがあります。個別規定は本規約の一部を構成し、本規約と矛盾する場合は個別規定が優先されます。ユーザーは本アプリを利用することにより、本規約のすべての条項に同意したものとみなされます。</p>
            <p><strong>第2条（定義）</strong><br/>「コンテンツ」：テキスト、画像、音声、動画、プログラム、データベースその他一切の情報。「ユーザー投稿情報」：ユーザーが本アプリに保存、投稿、アップロードした一切のデータ（PDF、学習履歴等を含む）。「外部サービス」：Amazon、楽天、メルカリ等、第三者が提供するサービス。「アカウント」：ユーザー識別のために付与される利用権限。「知的財産権」：著作権、特許権、商標権、営業秘密その他一切の権利。</p>
            <p><strong>第3条（利用登録およびアカウント管理）</strong><br/>利用希望者は本規約に同意のうえ、当開発者の定める方法により登録申請を行い、承認された時点で利用契約が成立します。虚偽情報の申請・過去の規約違反・その他不適切と合理的に判断される場合、当開発者は登録を拒否できます。ユーザーはアカウント情報を自己責任で管理し、第三者への開示・貸与・譲渡はなりません。不正利用による損害はユーザーが負担し、当開発者は責任を負いません。不正利用を発見した場合は速やかに当開発者へ通知するものとします。</p>
            <p><strong>第4条（サービス内容）</strong><br/>本アプリは、教材・書籍検索（アフィリエイトリンク含む）、学習データ管理（PDF・本棚機能）、学習時間記録および分析、その他当開発者が追加する機能を提供します。当開発者は機能の追加・変更・削除を自由に行うことができます。</p>
            <p><strong>第5条（禁止事項）</strong><br/>ユーザーは以下の行為を行ってはなりません。【技術的侵害行為】スクレイピング・クローリング等の自動取得、APIの不正利用、リバースエンジニアリング、セキュリティ回避行為。【サービス妨害】サーバー負荷行為、DDoS攻撃、不正アクセス、他ユーザーの利用妨害。【法令・倫理違反】知的財産権侵害、犯罪行為、名誉毀損、不適切コンテンツ投稿。【商業的不正利用】無断転載・再配布、本サービスの競合サービス開発目的での利用。</p>
            <p><strong>第6条（違反時の措置）</strong><br/>規約違反が認められた場合、当開発者はアカウント停止・利用制限・データ削除を実施できます。損害が発生した場合、ユーザーはその全額を賠償する義務を負います。悪質な場合、刑事告訴・民事訴訟を含む法的措置を取ります。</p>
            <p><strong>第7条（知的財産権）</strong><br/>本アプリの権利はすべて当開発者または正当な権利者に帰属します。ユーザー投稿情報の権利はユーザーに留保されます。ただしユーザーは、運営に必要な範囲で無償利用を許諾します。ユーザーは第三者権利を侵害しないことを保証します。</p>
            <p><strong>第8条（データおよびバックアップ）</strong><br/>当開発者はデータの保存を保証しません。ユーザーは自己責任でバックアップを行うものとします。データ消失による損害について責任を負いません。</p>
            <p><strong>第9条（外部サービス）</strong><br/>外部サービスとの取引はユーザー責任で行われます。商品品質・配送・価格の正確性は保証されません。トラブルについて当開発者は関与しません。</p>
            <p><strong>第10条（サービスの変更・停止）</strong><br/>保守・障害・不可抗力等の場合にサービスを停止できます。サービス終了も可能です。これに伴う損害責任は負いません。</p>
            <p><strong>第11条（非保証）</strong><br/>当開発者は以下を保証しません：正確性、完全性、有用性、継続性、エラーがないこと。</p>
            <p><strong>第12条（責任制限）</strong><br/>当開発者の責任は限定されます。間接損害・逸失利益は対象外です。法令上許される最大限まで制限されます。</p>
            <p><strong>第13条（プライバシー）</strong><br/>個人情報は別途ポリシーに従い処理されます。</p>
            <p><strong>第14条（規約変更）</strong><br/>当開発者は自由に変更可能です。掲載時点で効力が発生し、継続利用により同意とみなされます。</p>
            <p><strong>第15条（契約の終了）</strong><br/>ユーザーはいつでも退会可能です。当開発者は違反時に強制解約可能です。終了後も一部条項は存続します。</p>
            <p><strong>第16条（準拠法・管轄）</strong><br/>日本法準拠。専属管轄は当開発者所在地裁判所とします。</p>
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
            <p><strong>第1条（基本方針および適用範囲）</strong><br/>当開発者は、アプリケーション「Mercury」においてユーザーの個人情報の保護を最重要事項として位置付けます。個人情報の保護に関する法律その他関連法令、各国規制（GDPR・CCPA等）、およびGoogle API Services User Data Policyを遵守し、適法かつ公正な手段により情報を取得・利用・管理します。目的限定原則・データ最小化原則・透明性の確保・安全管理の徹底の原則に基づき運用します。</p>
            <p><strong>第2条（定義）</strong><br/>「個人情報」：特定の個人を識別できる情報。「ユーザーデータ」：ユーザーが本アプリに提供または生成するすべての情報。「Googleユーザーデータ」：Googleアカウント連携により取得される情報。「処理」：取得・保存・利用・削除等の一切の取扱い。</p>
            <p><strong>第3条（収集する情報）</strong><br/>【ユーザー行動データ】検索履歴・閲覧履歴・学習時間・教材登録情報・操作ログ・設定情報。【技術情報】デバイス識別子（広告ID等）・OS・ブラウザ・言語設定・IPアドレス・アクセス日時。【Cookieおよび類似技術】セッション管理・利用状況分析・広告効果測定。【外部連携情報】Google Driveアクセストークン・API経由のメタデータ。</p>
            <p><strong>第4条（Googleユーザーデータの特別規定）</strong><br/>Google Drive連携機能を提供するにあたり以下を厳守します。【利用目的の厳格限定】Googleユーザーデータはユーザーが指定したファイルの表示・本アプリ内での閲覧機能提供のみに使用します。広告・分析・機械学習・第三者提供には一切利用しません。【非保存原則】ファイル本体はサーバーに保存しません。データは一時的処理のみ。キャッシュも恒久保存しません。【人的アクセス制限】ユーザーからの明示的なサポート依頼・セキュリティ対応・法令対応の場合を除き、人間がデータへアクセスすることはありません。【第三者提供の禁止】法令に基づく場合・明示的同意を除き提供されません。【セキュリティ管理】OAuthトークンの安全管理・HTTPS通信の強制・不正アクセス防止。</p>
            <p><strong>第5条（利用目的）</strong><br/>収集した情報はサービス提供・維持・改善、パーソナライズ、不正利用検知、ユーザーサポート、統計分析（匿名化データのみ）の範囲で利用されます。目的外利用は行いません。</p>
            <p><strong>第6条（広告およびトラッキング）</strong><br/>本アプリはAmazonアソシエイト・楽天アフィリエイト・メルカリアンバサダーを利用します。これらはCookie等を利用する場合があります。ユーザーはブラウザ設定によりCookieを制御できます。</p>
            <p><strong>第7条（第三者提供）</strong><br/>本人同意・法令要求・緊急保護の場合を除き、個人情報を第三者に提供しません。</p>
            <p><strong>第8条（委託・外部処理）</strong><br/>クラウドインフラ・認証・分析等の処理を外部委託する場合があります。委託先は適切に監督されます。</p>
            <p><strong>第9条（データ保存期間）</strong><br/>必要最小限の期間のみ保持します。不要データは削除または匿名化します。法令義務がある場合は保存します。</p>
            <p><strong>第10条（国際データ移転）</strong><br/>個人情報は国外に移転される場合があります。この場合、適切な保護措置を講じます。</p>
            <p><strong>第11条（安全管理措置）</strong><br/>SSL/TLS暗号化・アクセス制御・セキュリティ監査・不正アクセス防止を実施します。ただし完全な安全性は保証されません。</p>
            <p><strong>第12条（ユーザーの権利）</strong><br/>ユーザーは開示・訂正・削除・利用停止・データポータビリティを行う権利を有します。</p>
            <p><strong>第13条（未成年）</strong><br/>未成年は保護者同意が必要です。</p>
            <p><strong>第14条（責任の限定）</strong><br/>外部サービス起因の問題・ユーザーの管理不備・通信環境の問題について責任を負いません。</p>
            <p><strong>第15条（ポリシーの変更）</strong><br/>本ポリシーは変更可能です。掲示時点で効力が発生し、継続利用により同意とみなされます。</p>
            <p><strong>第16条（お問い合わせ）</strong><br/>問い合わせはアプリ内または開発者へご連絡ください。</p>
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