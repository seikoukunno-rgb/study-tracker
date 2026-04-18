"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ChevronRight, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function GoogleDriveSetup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [materialTitle, setMaterialTitle] = useState<string>("");
  const [iconUrl, setIconUrl] = useState<string>("");

  useEffect(() => {
    // URL パラメータからタイトルとアイコンを取得
    const title = searchParams.get("title") || "";
    const icon = searchParams.get("icon") || "";
    setMaterialTitle(title);
    setIconUrl(icon);
    
    checkSession();
  }, [searchParams]);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (!session?.provider_token) {
        setError("Google Drive のアクセス権限が必要です。再ログインしてください。");
        setLoading(false);
        return;
      }

      // Google Drive のファイル一覧を取得
      fetchGoogleDriveFiles(session.provider_token);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchGoogleDriveFiles = async (token: string) => {
    try {
      const response = await fetch(
        `/api/google-drive/list?query=${encodeURIComponent("mimeType='application/pdf'")}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
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

  const handleRegister = async () => {
    if (!selectedFile) {
      setError("ファイルを選択してください");
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

      // materials テーブルに新しいレコードを追加
      const { data, error: insertError } = await supabase
        .from("materials")
        .insert({
          student_id: user.id,
          title: materialTitle,
          google_drive_file_id: selectedFile.id,
          storage_type: "google_drive",
          image_url: iconUrl || "", // URL パラメータから受け取ったアイコンを使用
        })
        .select();

      if (insertError) {
        throw insertError;
      }

      localStorage.setItem('google_drive_connected', 'true');
      setSuccess(true);

      // 3秒後にホーム画面に戻る
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
        <p className="text-slate-400 text-center mb-8 text-sm">
          学習用 PDF を Google Drive から選択して登録してください
        </p>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/20 border border-rose-500 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <p className="text-rose-300 text-sm">{error}</p>
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

        {/* ファイル選択 */}
        {files.length > 0 ? (
          <div className="space-y-3 mb-6">
            <p className="text-sm text-slate-400 font-black">PDF ファイルを選択</p>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => setSelectedFile(file)}
                  disabled={registering}
                  className={`w-full p-4 rounded-lg text-left transition-all active:scale-95 disabled:opacity-50 ${
                    selectedFile?.id === file.id
                      ? "bg-indigo-600 border-2 border-indigo-500"
                      : "bg-[#1a1a1a] border-2 border-[#2a2a2a] hover:border-indigo-500"
                  }`}
                >
                  <p className="font-bold truncate">{file.name}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(file.createdTime).toLocaleDateString("ja-JP")}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-[#1a1a1a] rounded-lg text-center text-slate-400">
            <p className="text-sm">Google Drive 内に PDF ファイルが見つかりません</p>
          </div>
        )}

        <button
          onClick={handleRegister}
          disabled={!selectedFile || !materialTitle || registering}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          {registering ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              登録中...
            </>
          ) : (
            <>
              登録
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

