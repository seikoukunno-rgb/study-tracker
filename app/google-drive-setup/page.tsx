"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ChevronRight, AlertCircle, CheckCircle2, Loader2, RefreshCw, UserCircle } from "lucide-react";

export default function GoogleDriveSetup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [materialTitle, setMaterialTitle] = useState<string>("");
  const [iconUrl, setIconUrl] = useState<string>("");

  useEffect(() => {
    const title = searchParams.get("title") || "";
    const icon = searchParams.get("icon") || "";
    setMaterialTitle(title);
    setIconUrl(icon);
    checkSession();
  }, [searchParams]);

  const checkSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (!session?.provider_token) {
        setError("Google Drive のアクセス権限が必要です。下の「再認証」ボタンを押してください。");
        setLoading(false);
        return;
      }

      // タイマーページでも使えるようにトークンをキャッシュ
      sessionStorage.setItem('drive_provider_token', session.provider_token);

      fetchGoogleDriveFiles(session.provider_token);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleReauth = async (selectAccount = false) => {
    const title = searchParams.get("title") || materialTitle;
    const icon = searchParams.get("icon") || iconUrl;
    const driveSetupPath = `/google-drive-setup?title=${encodeURIComponent(title)}&icon=${encodeURIComponent(icon)}`;
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(driveSetupPath)}`;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        scopes: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
        queryParams: {
          access_type: "offline",
          prompt: selectAccount ? "select_account consent" : "consent",
        },
      },
    });
  };

  const fetchGoogleDriveFiles = async (token: string) => {
    try {
      const response = await fetch(
        `/api/google-drive/list?query=${encodeURIComponent("mimeType='application/pdf'")}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        throw new Error("Google Drive のファイル取得に失敗しました");
      }

      const data = await response.json();
      setFiles(data.files || []);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const toggleFile = (file: any) => {
    setSelectedFiles((prev) =>
      prev.some((f) => f.id === file.id)
        ? prev.filter((f) => f.id !== file.id)
        : [...prev, file]
    );
  };

  const handleRegister = async () => {
    if (selectedFiles.length === 0) {
      setError("ファイルを1つ以上選択してください");
      return;
    }

    if (!materialTitle.trim()) {
      setError("教材名を入力してください");
      return;
    }

    setRegistering(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("ユーザー情報が取得できません");

      const fileIdValue =
        selectedFiles.length === 1
          ? selectedFiles[0].id
          : JSON.stringify(selectedFiles.map((f) => f.id));

      const { error: insertError } = await supabase
        .from("materials")
        .insert({
          student_id: user.id,
          title: materialTitle,
          google_drive_file_id: fileIdValue,
          storage_type: "google_drive",
          image_url: iconUrl || "",
        })
        .select();

      if (insertError) throw insertError;

      localStorage.setItem("google_drive_connected", "true");
      setSuccess(true);

      setTimeout(() => {
        router.push("/");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "登録に失敗しました");
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-indigo-500" />
          <p className="text-slate-400">Google Drive のファイルを読み込み中...</p>
        </div>
      </div>
    );
  }

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
      <div className="max-w-md w-full">
        <h1 className="text-3xl font-black mb-2 text-center tracking-widest">
          Google Drive Setup
        </h1>
        <p className="text-slate-400 text-center mb-6 text-sm">
          学習用 PDF を Google Drive から選択して登録してください
        </p>

        {/* アカウント情報 + 切り替えボタン */}
        <div className="mb-6 flex items-center justify-between bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <UserCircle className="w-4 h-4 text-slate-400" />
            <span className="truncate max-w-[180px]">{session?.user?.email || "未ログイン"}</span>
          </div>
          <button
            onClick={() => handleReauth(true)}
            className="flex items-center gap-1.5 text-xs font-black text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            アカウント切替
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/20 border border-rose-500 rounded-lg flex flex-col gap-3">
            <div className="flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-rose-300 text-sm">{error}</p>
            </div>
            <button
              onClick={() => handleReauth(false)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> 再認証する
            </button>
          </div>
        )}

        {/* 教材名入力 */}
        <div className="mb-6">
          <label className="text-sm font-black text-slate-300 mb-2 block">教材名</label>
          <input
            type="text"
            placeholder="例：高校数学 II"
            value={materialTitle}
            onChange={(e) => setMaterialTitle(e.target.value)}
            className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        {/* ファイル選択（複数可） */}
        {files.length > 0 ? (
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400 font-black">PDF ファイルを選択（複数可）</p>
              {selectedFiles.length > 0 && (
                <span className="text-xs font-black text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full">
                  {selectedFiles.length}件選択中
                </span>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {files.map((file) => {
                const isSelected = selectedFiles.some((f) => f.id === file.id);
                return (
                  <button
                    key={file.id}
                    onClick={() => toggleFile(file)}
                    disabled={registering}
                    className={`w-full p-4 rounded-lg text-left transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3 ${
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
                      <p className="font-bold truncate">{file.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(file.createdTime).toLocaleDateString("ja-JP")}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : !error ? (
          <div className="mb-6 p-4 bg-[#1a1a1a] rounded-lg text-center text-slate-400">
            <p className="text-sm">Google Drive 内に PDF ファイルが見つかりません</p>
          </div>
        ) : null}

        <button
          onClick={handleRegister}
          disabled={selectedFiles.length === 0 || !materialTitle.trim() || registering}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          {registering ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              登録中...
            </>
          ) : (
            <>
              登録 {selectedFiles.length > 1 ? `(${selectedFiles.length}件)` : ""}
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>

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
