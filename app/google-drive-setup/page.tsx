"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ChevronRight, AlertCircle, CheckCircle2, Loader2,
  UserCircle, Plus, Trash2, X
} from "lucide-react";

type ConnectedAccount = { id: string; google_email: string };
type SelectedFile = { id: string; name: string; createdTime: string; accountId: string };

export default function GoogleDriveSetup() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [materialTitle, setMaterialTitle] = useState(searchParams.get("title") || "");
  const [iconUrl] = useState(searchParams.get("icon") || "");

  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [accountsLoading, setAccountsLoading] = useState(true);

  const [files, setFiles] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [fileSearch, setFileSearch] = useState("");

  // アカウントをまたいで選択ファイルを保持する
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);

  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchConnectedAccounts = useCallback(async () => {
    setAccountsLoading(true);
    const { data } = await supabase
      .from("user_connected_google_accounts")
      .select("id, google_email")
      .order("created_at", { ascending: true });

    const accounts = data ?? [];
    setConnectedAccounts(accounts);
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
    setAccountsLoading(false);
  }, [selectedAccountId]);

  const fetchFiles = useCallback(async (accountId: string) => {
    setFilesLoading(true);
    setFiles([]);
    setFileSearch("");
    setError(null);
    try {
      const res = await fetch(
        `/api/google-drive/list?accountId=${accountId}&query=${encodeURIComponent("mimeType='application/pdf'")}`
      );
      if (!res.ok) throw new Error("ファイル取得に失敗しました");
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setFilesLoading(false);
    }
  }, []);

  useEffect(() => { fetchConnectedAccounts(); }, []);
  useEffect(() => { if (selectedAccountId) fetchFiles(selectedAccountId); }, [selectedAccountId]);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const err = searchParams.get("error");
    if (connected === "true") {
      setToastMessage("Googleアカウントを連携しました！");
      fetchConnectedAccounts();
      setTimeout(() => setToastMessage(null), 4000);
    }
    if (err) {
      const messages: Record<string, string> = {
        oauth_cancelled: "Google認証がキャンセルされました",
        token_exchange_failed: "トークン交換に失敗しました",
        no_refresh_token: "更新トークンを取得できませんでした。再試行してください。",
        userinfo_failed: "アカウント情報の取得に失敗しました",
        db_error: "データベースへの保存に失敗しました",
      };
      setError(messages[err] ?? "エラーが発生しました");
    }
  }, [searchParams]);

  const handleConnectAccount = () => { window.location.href = "/api/auth/google-drive-link"; };

  const handleDisconnectAccount = async (accountId: string, email: string) => {
    if (!window.confirm(`「${email}」の連携を解除しますか？`)) return;
    await supabase.from("user_connected_google_accounts").delete().eq("id", accountId);
    // そのアカウントの選択済みファイルも除去
    setSelectedFiles(prev => prev.filter(f => f.accountId !== accountId));
    if (selectedAccountId === accountId) setSelectedAccountId(null);
    fetchConnectedAccounts();
  };

  const toggleFile = (file: any, accountId: string) => {
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

      // ファイルIDとアカウントIDの対応マップを保存
      const fileAccountMap = selectedFiles.map(f => ({ fileId: f.id, accountId: f.accountId }));

      // 単一アカウントの場合は旧来の connected_account_id も保存（後方互換）
      const uniqueAccountIds = [...new Set(selectedFiles.map(f => f.accountId))];
      const connectedAccountId = uniqueAccountIds.length === 1 ? uniqueAccountIds[0] : null;

      const { error: insertError } = await supabase
        .from("materials")
        .insert({
          student_id: user.id,
          title: materialTitle,
          google_drive_file_id: fileIdValue,
          storage_type: "google_drive",
          image_url: iconUrl || "",
          connected_account_id: connectedAccountId,
          file_account_map: fileAccountMap,
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => router.push("/"), 3000);
    } catch (e: any) {
      setError(e.message || "登録に失敗しました");
    } finally {
      setRegistering(false);
    }
  };

  // 選択済みファイルのアカウント別集計
  const selectionByAccount = connectedAccounts.map(acc => ({
    ...acc,
    count: selectedFiles.filter(f => f.accountId === acc.id).length,
  })).filter(a => a.count > 0);

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-2">登録完了！</h2>
          <p className="text-slate-400 mb-6">3秒後にホーム画面に戻ります...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100 p-6 flex flex-col items-center justify-center">
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl animate-in slide-in-from-top duration-300">
          {toastMessage}
        </div>
      )}

      <div className="max-w-md w-full">
        <h1 className="text-3xl font-black mb-2 text-center tracking-widest">
          Google Drive Setup
        </h1>
        <p className="text-slate-400 text-center mb-6 text-sm">
          複数アカウントの PDF を自由に選択して登録できます
        </p>

        {/* 連携済みアカウント */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
              連携済みアカウント
            </span>
            <button
              onClick={handleConnectAccount}
              className="flex items-center gap-1.5 text-xs font-black text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 px-3 py-1.5 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              追加
            </button>
          </div>

          {accountsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            </div>
          ) : connectedAccounts.length === 0 ? (
            <div className="bg-[#1a1a1a] border border-dashed border-[#3a3a3a] rounded-xl p-6 text-center">
              <UserCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm mb-4">まだ連携されていません</p>
              <button
                onClick={handleConnectAccount}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black rounded-xl transition-all active:scale-95"
              >
                Google Drive を連携する
              </button>
            </div>
          ) : (
            /* アカウントタブ — クリックでそのアカウントのファイルを表示 */
            <div className="flex gap-2 flex-wrap">
              {connectedAccounts.map((account) => {
                const selCount = selectedFiles.filter(f => f.accountId === account.id).length;
                const isActive = selectedAccountId === account.id;
                return (
                  <div key={account.id} className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedAccountId(account.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all text-sm font-bold ${
                        isActive
                          ? "bg-indigo-600/20 border-indigo-500 text-white"
                          : "bg-[#1a1a1a] border-[#2a2a2a] text-slate-400 hover:border-indigo-500/50"
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
                      className="p-1.5 text-slate-600 hover:text-rose-500 transition-colors rounded-lg"
                      title="連携解除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-rose-500/20 border border-rose-500 rounded-lg flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <p className="text-rose-300 text-sm">{error}</p>
          </div>
        )}

        {/* ファイル一覧（選択中アカウントのDrive） */}
        {selectedAccountId && connectedAccounts.length > 0 && (
          <div className="mb-4">
            {filesLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : files.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-black uppercase tracking-widest">
                    {connectedAccounts.find(a => a.id === selectedAccountId)?.google_email} の PDF
                  </p>
                </div>
                <input
                  type="text"
                  placeholder="ファイル名で検索..."
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors text-sm"
                />
                <div className="max-h-56 overflow-y-auto space-y-1.5">
                  {files
                    .filter(f => f.name.toLowerCase().includes(fileSearch.toLowerCase()))
                    .map((file) => {
                      const isSelected = selectedFiles.some(f => f.id === file.id);
                      return (
                        <button
                          key={file.id}
                          onClick={() => toggleFile(file, selectedAccountId)}
                          disabled={registering}
                          className={`w-full p-3.5 rounded-lg text-left transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-3 ${
                            isSelected
                              ? "bg-indigo-600 border-2 border-indigo-400"
                              : "bg-[#1a1a1a] border-2 border-[#2a2a2a] hover:border-indigo-500"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                            isSelected ? "bg-white border-white" : "border-slate-500"
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-indigo-600" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate text-sm">{file.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {new Date(file.createdTime).toLocaleDateString("ja-JP")}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-[#1a1a1a] rounded-lg text-center text-slate-400">
                <p className="text-sm">このアカウントの Google Drive 内に PDF ファイルが見つかりません</p>
              </div>
            )}
          </div>
        )}

        {/* 選択済みファイルのサマリー */}
        {selectedFiles.length > 0 && (
          <div className="mb-4 p-4 bg-[#1a1a1a] border border-indigo-500/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                選択済み — {selectedFiles.length}件
              </span>
              <button
                onClick={() => setSelectedFiles([])}
                className="text-xs text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" /> すべて解除
              </button>
            </div>
            {selectionByAccount.map(acc => (
              <div key={acc.id} className="flex items-center gap-2 text-xs text-slate-400">
                <UserCircle className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span className="truncate flex-1">{acc.google_email}</span>
                <span className="font-black text-indigo-300">{acc.count}件</span>
              </div>
            ))}
          </div>
        )}

        {/* 教材名 + 登録ボタン */}
        {connectedAccounts.length > 0 && (
          <>
            <div className="mb-4">
              <label className="text-sm font-black text-slate-300 mb-2 block">教材名</label>
              <input
                type="text"
                placeholder="例：高校数学 II"
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>

            <button
              onClick={handleRegister}
              disabled={selectedFiles.length === 0 || !materialTitle.trim() || registering}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              {registering ? (
                <><Loader2 className="w-5 h-5 animate-spin" />登録中...</>
              ) : (
                <>
                  登録 {selectedFiles.length > 0 ? `(${selectedFiles.length}件)` : ""}
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </>
        )}

        <button
          onClick={() => router.back()}
          disabled={registering}
          className="w-full mt-4 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-slate-300 font-bold py-4 rounded-xl transition-all disabled:opacity-50"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
