"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase"; 
import { Search, ChevronLeft, Book, Loader2, Plus, CheckCircle2, AlertCircle, Star, ShoppingCart, ExternalLink } from "lucide-react";

export default function SearchPage() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const [swipeState, setSwipeState] = useState<{ id: string | null; offset: number; isSwiping: boolean }>({
    id: null,
    offset: 0,
    isSwiping: false,
  });
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    const checkDarkMode = () => setIsDarkMode(localStorage.getItem('dark_mode') === 'true');
    checkDarkMode();
    window.addEventListener('darkModeChanged', checkDarkMode);
    return () => window.removeEventListener('darkModeChanged', checkDarkMode);
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    setResults([]);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=30&country=JP&key=${apiKey}`
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error("サーバーエラー詳細:", res.status, errorText);
        throw new Error(`検索サーバーエラー (${res.status}): 詳細を確認してください`);
      }

      const data = await res.json();
      
      if (data.items && data.items.length > 0) {
        const formatted = data.items.map((item: any) => {
          const info = item.volumeInfo;
          const thumbnail = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
          
          const rating = info.averageRating || 0;
          const reviewCount = info.ratingsCount || 0;
          let isbn = "";
          if (info.industryIdentifiers) {
            const isbn13 = info.industryIdentifiers.find((id: any) => id.type === "ISBN_13");
            const isbn10 = info.industryIdentifiers.find((id: any) => id.type === "ISBN_10");
            isbn = isbn13 ? isbn13.identifier : (isbn10 ? isbn10.identifier : "");
          }

          const amazonTag = process.env.NEXT_PUBLIC_AMAZON_TAG;
          const rakutenTag = process.env.NEXT_PUBLIC_RAKUTEN_TAG;
          const mercariAfid = process.env.NEXT_PUBLIC_MERCARI_AFID;
          const encodedIsbn = isbn ? encodeURIComponent(isbn) : "";
          const encodedTitle = encodeURIComponent(info.title);

          // ISBN優先、なければタイトル検索にフォールバック
          const amazonKeyword = isbn ? encodedIsbn : encodedTitle;
          const amazonUrl = `https://www.amazon.co.jp/gp/search?ie=UTF8&tag=${amazonTag}&keywords=${amazonKeyword}`;
          const rakutenUrl = `https://hb.afl.rakuten.co.jp/hgc/${rakutenTag}/?pc=https%3A%2F%2Fsearch.rakuten.co.jp%2Fsearch%2Fmall%2F${isbn ? encodedIsbn : encodedTitle}%2F`;
          const mercariUrl = `https://jp.mercari.com/search?keyword=${encodedTitle}${mercariAfid ? `&afid=${mercariAfid}` : ""}`;

          return {
            id: item.id,
            title: info.title,
            author: info.authors ? info.authors.join(", ") : "著者不明",
            image_url: thumbnail ? thumbnail.replace("http://", "https://") : null,
            rating: rating,
            reviewCount: reviewCount,
            amazonUrl,
            rakutenUrl,
            mercariUrl,
          };
        });
        setResults(formatted);

        // ==========================================
        // 🌟 改善ポイント1：「チラ見せ（Peek）」アニメーション
        // ==========================================
        // 描画直後に、上から3つのカードだけ「シュッ」と左に動かしてスワイプできることをアピールする
        setTimeout(() => {
          const firstItems = formatted.slice(0, 3);
          firstItems.forEach((item: any, index: number) => {
            const el = document.getElementById(`swipe-card-${item.id}`);
            if (el) {
              el.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
              el.style.transform = 'translateX(-50px)'; // 50px分だけ左にチラ見せ
              
              // 少し遅れて元の位置に戻す（波のようにズラすのがポイント）
              setTimeout(() => {
                el.style.transform = 'translateX(0px)';
                
                // アニメーションが終わったらインラインスタイルを消してReactに制御を戻す
                setTimeout(() => {
                  el.style.transition = '';
                  el.style.transform = '';
                }, 400);
              }, 400 + (index * 150)); 
            }
          });
        }, 100); // 描画直後のわずかなディレイ

      } else {
        setErrorMsg("教材が見つかりませんでした。別の言葉で試してください。");
      }
    } catch (err) {
      console.error("Search Error:", err);
      setErrorMsg("検索中にエラーが発生しました。通信環境を確認してください。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMaterial = async (item: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("ログインが必要です");

    console.log("🔥 チェック！送信直前のデータ:", { 
  id: user?.id, 
  title: item.title,
  fullUser: user 
});
console.log("保存するデータ:", { student_id: user?.id, title: item.title });
    const { error } = await supabase.from('materials').insert([{
      student_id: user.id,
      title: item.title,
      image_url: item.image_url,
    }]);

    if (error) {
      console.error(error);
      if (error.code === '23505' || error.message.includes('duplicate key')) {
        setToastType("error");
        setToastMessage(`「${item.title}」はすでに本棚にあります！`);
      } else {
        setToastType("error");
        setToastMessage(`追加エラー: ${error.message}`);
      }
      
      setSwipeState({ id: null, offset: 0, isSwiping: false });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setToastType("success");
    setToastMessage(`「${item.title}」を追加しました！`);
    
    setTimeout(() => {
      setToastMessage(null);
      router.push('/'); 
    }, 400);
  };

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    setTouchStartX(e.touches[0].clientX);
    setSwipeState({ id, offset: 0, isSwiping: true });
  };

  const handleTouchMove = (e: React.TouchEvent, id: string) => {
    if (swipeState.id !== id || touchStartX === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX;

    if (diff < 0) {
      setSwipeState(prev => ({ ...prev, offset: diff }));
    }
  };

  const handleTouchEnd = (item: any) => {
    if (swipeState.id !== item.id) return;

    if (swipeState.offset < -80) {
      setSwipeState({ id: item.id, offset: -window.innerWidth, isSwiping: false });
      handleAddMaterial(item);
    } else {
      setSwipeState({ id: null, offset: 0, isSwiping: false });
    }
    setTouchStartX(null);
  };

  const bgPage = isDarkMode ? "bg-[#0a0a0a] text-slate-100" : "bg-slate-50 text-slate-900";
  const bgCard = isDarkMode ? "bg-[#1c1c1e] border-[#2c2c2e]" : "bg-white border-slate-100";
  const textInput = isDarkMode ? "text-white" : "text-slate-900"; 
  const bgInput = isDarkMode ? "bg-[#2c2c2e] border-[#38383a]" : "bg-white border-slate-200 shadow-sm";

  return (
    <div className={`min-h-screen pb-10 font-sans transition-colors duration-300 overflow-x-hidden ${bgPage}`}>
      
      {toastMessage && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm animate-in slide-in-from-top-4 duration-300">
          <div className={`px-6 py-4 rounded-2xl shadow-xl font-bold flex items-center gap-3 text-white ${toastType === 'error' ? 'bg-rose-500' : 'bg-emerald-600'}`}>
            {toastType === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            <span className="text-sm leading-tight">{toastMessage}</span>
          </div>
        </div>
      )}

      <header className="px-4 py-6 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-black">教材を検索</h1>
      </header>

      <main className="px-5 space-y-6">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="教材名・著者名を入力"
            className={`w-full rounded-2xl pl-6 pr-14 py-5 font-bold outline-none border-2 focus:border-indigo-500 transition-all ${bgInput} ${textInput}`}
          />
          <button 
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-transform"
          >
            <Search className="w-5 h-5" />
          </button>
        </form>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm font-bold text-slate-400">検索中...</p>
            </div>
          ) : errorMsg ? (
            <div className="flex flex-col items-center py-20 gap-3 text-rose-500 animate-in fade-in">
              <AlertCircle className="w-10 h-10 opacity-20" />
              <p className="text-center text-sm font-bold max-w-[250px] leading-relaxed">{errorMsg}</p>
            </div>
          ) : (
            results.map((item) => {
              const isThresholdPassed = swipeState.id === item.id && swipeState.offset < -80;

              return (
                <div key={item.id} className="relative rounded-[1.5rem] mb-4 overflow-hidden animate-in fade-in duration-500">
                  
                  {/* スワイプ背景 */}
                  <div className={`absolute inset-0 flex items-center justify-end px-6 rounded-[1.5rem] transition-colors duration-200 ${isThresholdPassed ? 'bg-emerald-500' : 'bg-emerald-400'}`}>
                    <Plus className={`text-white transition-transform duration-200 ${isThresholdPassed ? 'w-10 h-10 scale-110' : 'w-8 h-8 scale-90 opacity-80'}`} />
                  </div>

                  {/* 前面のカード */}
                  <div
                    id={`swipe-card-${item.id}`} // 🌟 改善ポイント1: IDを付与してアニメーション制御
                    onTouchStart={(e) => handleTouchStart(e, item.id)}
                    onTouchMove={(e) => handleTouchMove(e, item.id)}
                    onTouchEnd={() => handleTouchEnd(item)}
                    style={{
                      transform: swipeState.id === item.id ? `translateX(${swipeState.offset}px)` : undefined,
                      transition: swipeState.isSwiping && swipeState.id === item.id ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
                      touchAction: 'pan-y'
                    }}
                    // 🌟 改善ポイント2：影(Polish)の強化。スワイプ中は影が濃くなり浮き上がる！
                    className={`relative z-10 flex items-start gap-4 p-4 border transition-shadow duration-300 ${bgCard} ${swipeState.id === item.id ? (isDarkMode ? 'shadow-2xl shadow-black/60' : 'shadow-xl shadow-indigo-900/10') : 'shadow-sm'}`}
                  >
                    <div className="w-16 h-24 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200/50 mt-1">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover pointer-events-none" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300"><Book className="w-6 h-6" /></div>
                      )}
                    </div>
                    
                    {/* 🌟 右側の余白を少し広げて、矢印アイコンの場所を確保 */}
                    <div className="flex-1 min-w-0 py-1 pr-6 relative">
                      <h3 className={`text-sm font-black line-clamp-2 mb-1 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{item.title}</h3>
                      <p className="text-[10px] font-bold text-slate-400 line-clamp-1 mb-2">{item.author}</p>
                      
                      <div className="flex items-center gap-1 mb-3 pointer-events-none">
                        <Star className={`w-3.5 h-3.5 ${item.rating > 0 ? 'text-amber-400 fill-current' : 'text-slate-300'}`} />
                        <span className="text-[10px] font-bold text-slate-500">
                          {item.rating > 0 ? `${item.rating} (${item.reviewCount}件)` : "評価なし"}
                        </span>
                      </div>

                      <div className="flex gap-1.5 mt-1">
                        <a
                          href={item.amazonUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onTouchStart={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 flex items-center justify-center gap-1 text-[10px] font-black bg-[#FF9900] text-white py-2 rounded-lg active:opacity-70 transition-opacity"
                        >
                          <ShoppingCart className="w-3 h-3 shrink-0" /> Amazon
                        </a>
                        <a
                          href={item.rakutenUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onTouchStart={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 flex items-center justify-center gap-1 text-[10px] font-black bg-[#BF0000] text-white py-2 rounded-lg active:opacity-70 transition-opacity"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" /> 楽天
                        </a>
                        <a
                          href={item.mercariUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onTouchStart={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 flex items-center justify-center gap-1 text-[10px] font-black bg-[#FF0211] text-white py-2 rounded-lg active:opacity-70 transition-opacity"
                        >
                          <ShoppingCart className="w-3 h-3 shrink-0" /> メルカリ
                        </a>
                      </div>

                      {/* ========================================== */}
                      {/* 🌟 改善ポイント3：スワイプの矢印（Indicator） */}
                      {/* ========================================== */}
                      {!swipeState.id && ( // 何も触っていない時だけ、控えめに点滅させて知らせる
                        <div className={`absolute top-1/2 right-0 -translate-y-1/2 pointer-events-none animate-pulse ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>
                          <ChevronLeft className="w-6 h-6 opacity-60" />
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}