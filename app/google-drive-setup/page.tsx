"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { selectDrivePdfs, type DrivePdf } from "@/lib/google-drive/picker";
import {
  ChevronRight, AlertCircle, CheckCircle2, Loader2,
  UserCircle, Plus, Trash2, X, Sun, Moon
} from "lucide-react";

const PRESET_ICONS = [
  "/icons/blue.png", "/icons/black.png", "/icons/gold.png", "/icons/green.png",
  "/icons/orange.png", "/icons/purple.png", "/icons/red.png",
  "/icons/silver.png", "/icons/yellow.png", "/icons/vocabulary-book.png",
];

type ConnectedAccount = { id: string; google_email: string };
type SelectedFile = { id: string; name: string; createdTime?: string; accountId: string };

// Supabase(PostgREST)のエラーは Error インスタンスではなく { code, message } の普通のオブジェクトなので、
// instanceof Error では判定できない。ここで原因が分かるメッセージに変換する。
function describeRegisterError(e: unknown): { message: string; duplicate: boolean } {
  const err = (e ?? {}) as { code?: string; message?: string; details?: string };
  const raw = err.message || (e instanceof Error ? e.message : "");

  if (err.code === "23505" || /duplicate key|unique constraint/i.test(raw)) {
    return { message: "同じ名前の教材がすでに本棚にあります。別の教材名にしてください。", duplicate: true };
  }
  if (err.code === "42501" || /row-level security|permission denied/i.test(raw)) {
    return { message: "保存する権限がありません。一度ログアウトして、ログインし直してください。", duplicate: false };
  }
  if (err.code === "PGRST301" || /jwt|not authenticated|ユーザー情報/i.test(raw)) {
    return { message: "ログインの有効期限が切れました。ログインし直してください。", duplicate: false };
  }
  if (/failed to fetch|networkerror|network request failed/i.test(raw)) {
    return { message: "通信に失敗しました。ネットワークを確認して、もう一度お試しください。", duplicate: false };
  }
  return { message: raw ? `登録に失敗しました：${raw}` : "登録に失敗しました", duplicate: false };
}

// 「教材名」「教材名 (2)」「教材名 (3)」… のうち、まだ使われていない名前を返す
async function suggestFreeTitle(baseTitle: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("materials")
      .select("title")
      .eq("student_id", user.id)
      .ilike("title", `${baseTitle.replace(/[%_]/g, "\\$&")}%`);
    if (error || !data) return null;
    const used = new Set(data.map((m: { title: string }) => m.title));
    for (let n = 2; n < 100; n++) {
      const candidate = `${baseTitle} (${n})`;
      if (!used.has(candidate)) return candidate;
    }
    return null;
  } catch {
    return null;
  }
}

function GoogleDriveSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [materialTitle, setMaterialTitle] = useState(searchParams.get("title") || "");
  const [selectedIconUrl, setSelectedIconUrl] = useState(
    searchParams.get("icon") || PRESET_ICONS[0]
  );

  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [accountsLoading, setAccountsLoading] = useState(true);

  const [files, setFiles] = useState<DrivePdf[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [fileSearch, setFileSearch] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);

  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("dark_mode");
    // Hydrate the persisted theme after the browser becomes available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDarkMode(stored !== "false");
  }, []);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem("dark_mode", String(next));
  };

  const fetchConnectedAccounts = useCallback(async () => {
    setAccountsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAccountsLoading(false); router.push('/login'); return; }
    const { data, error: accountError } = await supabase
      .from("user_connected_google_accounts").select("id, google_email")
      .eq("user_id", user.id).order("created_at", { ascending: true });
    if (accountError) setError("連携アカウントの取得に失敗しました");
    const accounts = data ?? [];
    setConnectedAccounts(accounts);
    setSelectedAccountId(current => accounts.some(a => a.id === current) ? current : accounts[0]?.id ?? null);
    setAccountsLoading(false);
  }, [router]);

  const fetchFiles = useCallback(async (accountId: string, signal?: AbortSignal) => {
    setFilesLoading(true);
    setFiles([]);
    setFileSearch("");
    setFilesError(null);
    try {
      const res = await fetch(`/api/google-drive/list?accountId=${encodeURIComponent(accountId)}`, { signal, cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ファイル取得に失敗しました");
      if (!signal?.aborted) setFiles(data.files ?? []);
    } catch (e) {
      if (!signal?.aborted) setFilesError(e instanceof Error ? e.message : "ファイル取得に失敗しました");
    } finally {
      if (!signal?.aborted) setFilesLoading(false);
    }
  }, []);

  // Load authenticated external data when this page mounts.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchConnectedAccounts(); }, [fetchConnectedAccounts]);
  useEffect(() => {
    const controller = new AbortController();
    // Reset loading state while synchronizing with the selected account.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (selectedAccountId) void fetchFiles(selectedAccountId, controller.signal);
    return () => controller.abort();
  }, [selectedAccountId, fetchFiles]);

  const handlePickFiles = async () => {
    const account = connectedAccounts.find(a => a.id === selectedAccountId);
    if (!account) return;
    setPickerLoading(true);
    setError(null);
    try {
      const picked = await selectDrivePdfs(account.id, account.google_email);
      if (picked.length === 0) return;
      setFiles(current => [...current.filter(f => !picked.some(p => p.id === f.id)), ...picked]);
      setSelectedFiles(current => [...current.filter(f => !picked.some(p => p.id === f.id)),
        ...picked.map(file => ({ ...file, accountId: account.id }))]);
      setFilesError(null);
    } catch (e) { setError(e instanceof Error ? e.message : "PDFの選択に失敗しました"); }
    finally { setPickerLoading(false); }
  };

  useEffect(() => {
    // OAuth redirects supply one-time feedback from an external system.
    const connected = searchParams.get("connected");
    const err = searchParams.get("error");
    if (connected === "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToastMessage("Googleアカウントを連携しました！");
      setTimeout(() => setToastMessage(null), 4000);
    }
    if (err) {
      const messages: Record<string, string> = {
        invalid_state: "認証の有効期限が切れました。もう一度連携してください。",
        scope_missing: "Driveの権限が許可されませんでした。再連携してください。",
        oauth_failed: "Google連携に失敗しました。再試行してください。",
        oauth_cancelled: "Google認証がキャンセルされました",
        token_exchange_failed: "トークン交換に失敗しました",
        no_refresh_token: "更新トークンを取得できませんでした。再試行してください。",
        userinfo_failed: "アカウント情報の取得に失敗しました",
        db_error: "データベースへの保存に失敗しました",
      };
      setError(messages[err] ?? "エラーが発生しました");
    }
  }, [searchParams, fetchConnectedAccounts]);

  const handleConnectAccount = () => { window.location.href = "/api/auth/google-drive-link"; };

  const handleDisconnectAccount = async (accountId: string, email: string) => {
    if (!window.confirm(`「${email}」の連携を解除しますか？`)) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error: deleteError } = await supabase.from("user_connected_google_accounts").delete().eq("id", accountId).eq("user_id", user.id);
    if (deleteError) { setError("連携解除に失敗しました"); return; }
    setSelectedFiles(prev => prev.filter(f => f.accountId !== accountId));
    if (selectedAccountId === accountId) setSelectedAccountId(null);
    fetchConnectedAccounts();
  };

  const toggleFile = (file: DrivePdf, accountId: string) => {
    setSelectedFiles(prev =>
      prev.some(f => f.id === file.id)
        ? prev.filter(f => f.id !== file.id)
        : [...prev, { id: file.id, name: file.name, createdTime: file.createdTime, accountId }]
    );
  };

  const handleRegister = async () => {
    if (selectedFiles.length === 0) { setError("ファイルを1つ以上選択してください"); return; }
    if (!materialTitle.trim()) { setError("教材名を入力してください"); return; }

    setRegistering(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("ユーザー情報が取得できません");

      const fileIdValue =
        selectedFiles.length === 1
          ? selectedFiles[0].id
          : JSON.stringify(selectedFiles.map(f => f.id));

      const fileAccountMap = selectedFiles.map(f => ({ fileId: f.id, accountId: f.accountId, fileName: f.name }));
      const uniqueAccountIds = [...new Set(selectedFiles.map(f => f.accountId))];
      const connectedAccountId = uniqueAccountIds.length === 1 ? uniqueAccountIds[0] : null;

      const { error: insertError } = await supabase
        .from("materials")
        .insert({
          student_id: user.id,
          title: materialTitle,
          google_drive_file_id: fileIdValue,
          storage_type: "google_drive",
          image_url: selectedIconUrl || "",
          connected_account_id: connectedAccountId,
          file_account_map: fileAccountMap,
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => router.push("/home"), 3000);
    } catch (e) {
      console.error("教材登録エラー:", e);
      const info = describeRegisterError(e);
      if (info.duplicate) {
        // 同名の教材がすでにあるときは、空いている名前を提案して入力欄に入れる
        const suggested = await suggestFreeTitle(materialTitle.trim());
        if (suggested) {
          setMaterialTitle(suggested);
          setError(`「${materialTitle.trim()}」という名前の教材はすでに本棚にあります。「${suggested}」に変更したので、このままもう一度「登録」を押してください。`);
        } else {
          setError(info.message);
        }
      } else {
        setError(info.message);
      }
    } finally {
      setRegistering(false);
    }
  };

  const selectionByAccount = connectedAccounts
    .map(acc => ({ ...acc, count: selectedFiles.filter(f => f.accountId === acc.id).length }))
    .filter(a => a.count > 0);

  // ── theme tokens ──
  const bg = isDarkMode ? "bg-[#0a0a0a] text-slate-100" : "bg-slate-50 text-slate-900";
  const inputCls = isDarkMode
    ? "bg-[#1a1a1a] border-[#2a2a2a] text-slate-100 placeholder-slate-500 focus:border-indigo-500"
    : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500";
  const textSub = isDarkMode ? "text-slate-400" : "text-slate-500";
  const textMain = isDarkMode ? "text-slate-100" : "text-slate-800";

  if (success) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg}`}>
        <div className="text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-2">登録完了！</h2>
          <p className={`mb-6 ${textSub}`}>3秒後にホーム画面に戻ります...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-12 font-sans transition-colors duration-300 ${bg}`}>
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl animate-in slide-in-from-top duration-300">
          {toastMessage}
        </div>
      )}

      {/* ヘッダー */}
      <header className={`sticky top-0 z-10 px-5 py-4 flex items-center justify-between border-b transition-colors ${isDarkMode ? 'bg-[#0a0a0a] border-[#1a1a1a]' : 'bg-slate-50 border-slate-100'}`}>
        <div>
          <h1 className={`text-lg font-black tracking-widest ${textMain}`}>Google Drive Setup</h1>
          <p className={`text-[10px] font-bold ${textSub}`}>複数アカウントの PDF を自由に選択して登録</p>
        </div>
        <button
          onClick={toggleDarkMode}
          className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-colors ${isDarkMode ? 'bg-[#1a1a1a] border-[#2a2a2a] text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}
          aria-label="ダークモード切替"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </header>

      <div className="max-w-md mx-auto px-5 pt-6 space-y-6">

        {/* ── アイコン選択 ── */}
        <section>
          <p className={`text-xs font-black uppercase tracking-widest mb-3 ${textSub}`}>アイコンを選択</p>
          {/* 大きいプレビュー */}
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-lg ring-4 ring-indigo-500/20">
              <img src={selectedIconUrl} alt="selected icon" className="w-full h-full object-cover" />
            </div>
          </div>
          {/* アイコングリッド */}
          <div className="grid grid-cols-6 gap-2">
            {PRESET_ICONS.map((url) => {
              const isSelected = selectedIconUrl === url;
              return (
                <button
                  key={url}
                  onClick={() => setSelectedIconUrl(url)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all active:scale-90
                    ${isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-400/40 shadow-md scale-110 z-10'
                      : isDarkMode ? 'border-[#2a2a2a] opacity-60 hover:opacity-100' : 'border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                >
                  <img src={url} alt="icon" className="w-full h-full object-cover pointer-events-none" />
                  {isSelected && (
                    <div className="absolute bottom-0.5 right-0.5 bg-indigo-600 rounded-full p-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── 連携済みアカウント ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-black uppercase tracking-widest ${textSub}`}>連携済みアカウント</span>
            <button
              onClick={handleConnectAccount}
              className="flex items-center gap-1.5 text-xs font-black text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 px-3 py-1.5 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" /> 追加
            </button>
          </div>

          {accountsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            </div>
          ) : connectedAccounts.length === 0 ? (
            <div className={`border border-dashed rounded-xl p-6 text-center ${isDarkMode ? 'bg-[#1a1a1a] border-[#3a3a3a]' : 'bg-white border-slate-200'}`}>
              <UserCircle className={`w-8 h-8 mx-auto mb-2 ${textSub}`} />
              <p className={`text-sm mb-4 ${textSub}`}>まだ連携されていません</p>
              <button
                onClick={handleConnectAccount}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black rounded-xl transition-all active:scale-95"
              >
                Google Drive を連携する
              </button>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {connectedAccounts.map((account) => {
                const selCount = selectedFiles.filter(f => f.accountId === account.id).length;
                const isActive = selectedAccountId === account.id;
                return (
                  <div key={account.id} className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedAccountId(account.id)}
                      disabled={pickerLoading}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all text-sm font-bold ${
                        isActive
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                          : isDarkMode
                            ? "bg-[#1a1a1a] border-[#2a2a2a] text-slate-400 hover:border-indigo-500/50"
                            : "bg-white border-slate-200 text-slate-500 hover:border-indigo-400"
                      }`}
                    >
                      <UserCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate max-w-[120px]">{account.google_email}</span>
                      {selCount > 0 && (
                        <span className="bg-indigo-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {selCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleDisconnectAccount(account.id, account.google_email)}
                      disabled={pickerLoading}
                      className={`p-1.5 transition-colors rounded-lg ${textSub} hover:text-rose-500`}
                      title="連携解除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {error && (
          <div className="p-4 bg-rose-500/20 border border-rose-500 rounded-xl flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <p className="text-rose-400 text-sm">{error}</p>
          </div>
        )}

        {/* ── ファイル一覧 ── */}
        {selectedAccountId && connectedAccounts.length > 0 && (
          <section>
            <p className={`text-sm mb-3 ${textSub}`}>Google DriveからPDFを選択して、Mercuryでの利用を許可してください。一覧には許可済みのPDFが表示されます。</p>
            <div className="flex gap-2 mb-4">
              <button onClick={handlePickFiles} disabled={pickerLoading || filesLoading || registering} className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-2">
                {pickerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Google DriveからPDFを選択
              </button>
              <button onClick={handleConnectAccount} disabled={pickerLoading} className={`text-sm font-bold ${textSub}`}>再連携</button>
            </div>
            {filesError ? (
              <p role="alert" className="text-rose-400 text-sm">{filesError}</p>
            ) : filesLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : files.length > 0 ? (
              <div className="space-y-2">
                <p className={`text-xs font-black uppercase tracking-widest ${textSub}`}>
                  {connectedAccounts.find(a => a.id === selectedAccountId)?.google_email} の PDF
                </p>
                <input
                  type="text"
                  placeholder="ファイル名で検索..."
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border-2 outline-none transition-colors text-sm ${inputCls}`}
                />
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {files
                    .filter(f => f.name.toLowerCase().includes(fileSearch.toLowerCase()))
                    .map((file) => {
                      const isSelected = selectedFiles.some(f => f.id === file.id);
                      return (
                        <button
                          key={file.id}
                          onClick={() => toggleFile(file, selectedAccountId)}
                          disabled={registering}
                          className={`w-full p-3.5 rounded-xl text-left transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-3 border-2 ${
                            isSelected
                              ? "bg-indigo-600/20 border-indigo-500"
                              : isDarkMode
                                ? "bg-[#1a1a1a] border-[#2a2a2a] hover:border-indigo-500/50"
                                : "bg-white border-slate-200 hover:border-indigo-400"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                            isSelected ? "bg-indigo-600 border-indigo-600" : isDarkMode ? "border-slate-500" : "border-slate-300"
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold truncate text-sm ${textMain}`}>{file.name}</p>
                            <p className={`text-xs mt-0.5 ${textSub}`}>
                              {file.createdTime ? new Date(file.createdTime).toLocaleDateString("ja-JP") : "Google Driveで選択したPDF"}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className={`p-4 rounded-xl text-center border ${isDarkMode ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-slate-200'}`}>
                <p className={`text-sm ${textSub}`}>許可済みのPDFはまだありません。「Google DriveからPDFを選択」で追加してください。</p>
              </div>
            )}
          </section>
        )}

        {/* ── 選択済みサマリー ── */}
        {selectedFiles.length > 0 && (
          <div className={`p-4 border border-indigo-500/30 rounded-xl space-y-2 ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-indigo-50'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                選択済み — {selectedFiles.length}件
              </span>
              <button
                onClick={() => setSelectedFiles([])}
                className={`text-xs flex items-center gap-1 hover:text-rose-400 transition-colors ${textSub}`}
              >
                <X className="w-3 h-3" /> すべて解除
              </button>
            </div>
            {selectionByAccount.map(acc => (
              <div key={acc.id} className={`flex items-center gap-2 text-xs ${textSub}`}>
                <UserCircle className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span className="truncate flex-1">{acc.google_email}</span>
                <span className="font-black text-indigo-400">{acc.count}件</span>
              </div>
            ))}
          </div>
        )}

        {/* ── 教材名 + 登録 ── */}
        {connectedAccounts.length > 0 && (
          <>
            <div>
              <label className={`text-xs font-black uppercase tracking-widest mb-2 block ${textSub}`}>教材名</label>
              <input
                type="text"
                placeholder="例：高校数学 II"
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                className={`w-full px-4 py-3.5 rounded-xl border-2 outline-none transition-colors font-bold ${inputCls}`}
              />
            </div>

            <button
              onClick={handleRegister}
              disabled={selectedFiles.length === 0 || !materialTitle.trim() || registering}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-indigo-600/20"
            >
              {registering ? (
                <><Loader2 className="w-5 h-5 animate-spin" />登録中...</>
              ) : (
                <>登録 {selectedFiles.length > 0 ? `(${selectedFiles.length}件)` : ""}<ChevronRight className="w-5 h-5" /></>
              )}
            </button>
          </>
        )}

        <button
          onClick={() => router.back()}
          disabled={registering}
          className={`w-full font-bold py-4 rounded-2xl transition-all disabled:opacity-50 border ${isDarkMode ? 'bg-[#1a1a1a] border-[#2a2a2a] text-slate-300 hover:bg-[#2a2a2a]' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

export default function GoogleDriveSetup() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}><GoogleDriveSetupContent /></Suspense>;
}
