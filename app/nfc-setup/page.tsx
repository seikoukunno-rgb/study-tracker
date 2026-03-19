"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, SmartphoneNfc, Copy, CheckCircle2, AlertCircle, Info, Settings, Book } from "lucide-react";

function NfcSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const subjectName = searchParams.get("subject") || "選択された教材";
  const imageUrl = searchParams.get("image");
  const subjectId = searchParams.get("id"); 

  const [os, setOs] = useState<"android" | "ios" | "other" | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  const [writeStatus, setWriteStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.indexOf("android") !== -1) {
      setOs("android");
    } else if (userAgent.indexOf("iphone") !== -1 || userAgent.indexOf("ipad") !== -1) {
      setOs("ios");
    } else {
      setOs("other");
    }
  }, []);

  // 🌟 ここを大修正！タイマー画面ではなく、トップ画面のモーダルを開くURLに変更
  const getTargetUrl = () => {
    if (typeof window === "undefined") return "";
    
    // IDをトップ画面に渡し、?record=ID の形式にする
    if (subjectId) {
      return `${window.location.origin}/?record=${subjectId}`;
    }
    
    // 万が一IDがない場合の予備ルートもトップ画面へ向ける
    const shortName = subjectName.substring(0, 3);
    return `${window.location.origin}/?record=${encodeURIComponent(shortName)}`;
  };

  const handleWriteNfc = async () => {
    const url = getTargetUrl();
    setErrorMessage(null);

    if (!('NDEFReader' in window)) {
      alert("NFCが許可されていません。Chromeの flags 設定を確認してください。");
      return;
    }

    try {
      setIsWriting(true);
      setWriteStatus("idle");
      
      // @ts-ignore
      const ndef = new NDEFReader();
      
      // URLレコードとして書き込む（これならスマホをかざすだけでブラウザが開く）
      await ndef.write({
        records: [{ recordType: "url", data: url }]
      });
      
      setWriteStatus("success");
    } catch (error: any) {
      console.error(error);
      setWriteStatus("error");
      
      if (error.name === "NotSupportedError") {
        setErrorMessage("このNFCタグの規格には対応していません。");
      } else if (error.name === "NotAllowedError") {
        setErrorMessage("NFCの書き込みが許可されませんでした。");
      } else {
        setErrorMessage(`書き込み失敗。タグをNFC Toolsで初期化するか、かざす時間を長くしてください。(${error.message || "IO Error"})`);
      }
    } finally {
      setIsWriting(false);
    }
  };

  const handleCopyUrl = async () => {
    const url = getTargetUrl();
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch (error) {
      alert("コピーに失敗しました。");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-4 z-20 sticky top-0">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-black tracking-tighter">NFCタグの登録</h1>
      </header>

      <main className="flex-grow p-4 md:p-8 max-w-2xl mx-auto w-full space-y-8">
        
        <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-black text-sm">1</div>
            <h2 className="text-lg font-black">登録する教材</h2>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
            <div className="w-16 h-20 bg-white rounded-lg shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
              {imageUrl ? (
                <img src={imageUrl} alt={subjectName} className="w-full h-full object-cover" />
              ) : (
                <Book className="w-8 h-8 text-slate-300" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-500 mb-1">Target Subject</p>
              <h3 className="text-base font-black text-slate-800 line-clamp-2">{subjectName}</h3>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-black text-sm">2</div>
            <h2 className="text-lg font-black">NFCタグに登録する</h2>
          </div>

          {os === "android" && (
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 text-center space-y-6">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <SmartphoneNfc className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 mb-2">スマホをNFCタグにかざす</h3>
                <p className="text-xs font-bold text-slate-500 leading-relaxed">
                  下のボタンを押してから、用意したNFCシールにスマホの背面をピタッと<span className="text-rose-500 font-black">3秒間動かさずに</span>くっつけてください。
                </p>
              </div>

              {writeStatus === "success" ? (
                <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl flex items-center justify-center gap-2 font-black text-sm">
                  <CheckCircle2 className="w-5 h-5" /> 書き込み成功！
                </div>
              ) : writeStatus === "error" ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 font-black text-sm">
                  <div className="flex items-center gap-2"><AlertCircle className="w-5 h-5" /> エラーが発生しました</div>
                  {errorMessage && <span className="text-xs font-medium text-rose-500 mt-1">{errorMessage}</span>}
                </div>
              ) : null}

              <button 
                onClick={handleWriteNfc}
                disabled={isWriting}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-sm font-black active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:animate-pulse"
              >
                <SmartphoneNfc className="w-5 h-5" /> {isWriting ? "かざしてください..." : "NFCに書き込む"}
              </button>
            </div>
          )}

          {(os === "ios" || os === "other") && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <p className="text-xs font-bold text-slate-500 mb-4 leading-relaxed">
                  iPhoneの場合は、標準の「ショートカット」アプリを使って設定します。まずは専用のURLをコピーしてください。
                </p>
                <button 
                  onClick={handleCopyUrl}
                  className={`w-full py-4 rounded-2xl text-sm font-black active:scale-95 transition-all flex items-center justify-center gap-2 border-2 ${isCopied ? 'bg-green-50 border-green-200 text-green-600' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'}`}
                >
                  {isCopied ? <><CheckCircle2 className="w-5 h-5" /> コピーしました！</> : <><Copy className="w-5 h-5" /> URLをコピーする</>}
                </button>
              </div>

              <div className="bg-slate-800 text-white p-6 md:p-8 rounded-[2rem] shadow-lg">
                <h3 className="text-sm font-black flex items-center gap-2 mb-6 text-indigo-300 uppercase tracking-widest">
                  <Settings className="w-4 h-4" /> 設定手順 (1分で完了)
                </h3>
                <ol className="space-y-6 text-sm font-bold relative before:absolute before:inset-y-0 before:left-3 before:w-0.5 before:bg-slate-700">
                  <li className="relative pl-10">
                    <div className="absolute left-0 w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-[10px] font-black z-10">1</div>
                    iPhoneの <span className="text-indigo-300">「ショートカット」アプリ</span> を開く
                  </li>
                  <li className="relative pl-10">
                    <div className="absolute left-0 w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-[10px] font-black z-10">2</div>
                    下部の <span className="text-indigo-300">「オートメーション」</span> タブから<br/>「＋」を押して <span className="text-indigo-300">「NFC」</span> を選ぶ
                  </li>
                  <li className="relative pl-10">
                    <div className="absolute left-0 w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-[10px] font-black z-10">3</div>
                    「スキャン」を押してNFCシールにかざし、<br/>「すぐに実行」にチェックを入れて次へ
                  </li>
                  <li className="relative pl-10">
                    <div className="absolute left-0 w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-[10px] font-black z-10">4</div>
                    <span className="text-indigo-300">「URLを開く」</span> アクションを追加し、<br/>先ほどコピーしたURLを貼り付ければ完了！
                  </li>
                </ol>
                <div className="mt-6 p-4 bg-indigo-500/20 rounded-xl flex items-start gap-3 border border-indigo-500/30">
                  <Info className="w-5 h-5 text-indigo-300 shrink-0 mt-0.5" />
                  <p className="text-[10px] leading-relaxed text-indigo-100">
                    一度設定すれば、次回からはロックを解除してスマホをかざすだけで、自動的に学習記録画面が開きます。
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function NfcSetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400 font-bold">読み込み中...</div>}>
      <NfcSetupContent />
    </Suspense>
  );
}