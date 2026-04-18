# Google Drive 連携フロー改善案

## 現在の問題点

1. **Google Drive との連携がない**
   - PDF は全て Supabase Storage に保存
   - Google 認証トークンが活用されていない
   - ユーザーが Google Drive 内のファイルを直接使用できない

2. **初回登録時に Google 認証が強制されていない**
   - `/app/onboarding/page.tsx` で Google 認証要求なし
   - Google トークンの再利用メカニズムがない

3. **セキュリティの懸念**
   - `/app/calendar/page.tsx` で `provider_token` をクライアント側で使用
   - CORS リスク、トークン露出リスク

---

## 改善案 1: 初回登録時に Google Drive 認証を強制する

### 現在の流れ
```
ログイン（Google 認証）
    ↓
/onboarding（ユーザー基本情報登録）
    ↓
/（ホーム画面）
```

### 改善後の流れ
```
ログイン（Google 認証）
    ↓
/onboarding
    ↓
/google-drive-setup（👈 新規追加）
  - Google Drive API スコープを追求
  - 再度 OAuth フロー（スコープ追加）
  - materials テーブルに google_auth_status を記録
    ↓
/（ホーム画面）
```

### 実装ステップ

#### Step 1: Database スキーマ更新

```sql
-- profiles テーブルに追加
ALTER TABLE profiles ADD COLUMN google_drive_enabled BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN google_drive_auth_date TIMESTAMP;

-- materials テーブルに追加
ALTER TABLE materials ADD COLUMN google_drive_file_id TEXT;
ALTER TABLE materials ADD COLUMN storage_type VARCHAR(10) DEFAULT 'supabase'; -- 'supabase' or 'google_drive'
```

#### Step 2: `/app/google-drive-setup/page.tsx` を作成

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Cloud, CheckCircle2, AlertCircle } from 'lucide-react';

export default function GoogleDriveSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'intro' | 'confirming' | 'success'>('intro');
  const [isLoading, setIsLoading] = useState(false);

  const handleEnableGoogleDrive = async () => {
    setIsLoading(true);
    
    try {
      // Google OAuth フロー再開（drive スコープ追加）
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${location.origin}/auth/callback?next=/google-drive-setup-verify`,
          scopes: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/calendar'
        },
      });

      if (error) throw error;
      setStep('confirming');
    } catch (error: any) {
      alert('Google Drive の認証に失敗しました: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {step === 'intro' && (
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center space-y-6 border border-indigo-100">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
              <Cloud className="w-8 h-8 text-indigo-600" />
            </div>
            
            <div>
              <h1 className="text-2xl font-black text-slate-900 mb-2">
                Google Drive を有効化
              </h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                Google Drive 内のファイルを直接登録したり、複数デバイス間で同期できるようになります。
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-left space-y-2">
              <p className="font-bold text-blue-900 text-sm">✨ できること</p>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Google Drive からファイルを直接登録</li>
                <li>• 複数デバイスから同じファイルにアクセス</li>
                <li>• Google Calendar との連携強化</li>
              </ul>
            </div>

            <button
              onClick={handleEnableGoogleDrive}
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black active:scale-95 transition-transform disabled:opacity-50"
            >
              {isLoading ? 'しばらくお待ちください...' : 'Google Drive を有効化'}
            </button>

            <button
              onClick={() => router.push('/')}
              className="w-full bg-slate-100 text-slate-700 p-4 rounded-2xl font-black active:scale-95 transition-transform"
            >
              スキップ
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center space-y-6 border border-green-100">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            
            <div>
              <h1 className="text-2xl font-black text-slate-900 mb-2">
                完了しました！
              </h1>
              <p className="text-sm text-slate-500">
                Google Drive との連携が有効になりました。
              </p>
            </div>

            <button
              onClick={() => router.push('/')}
              className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black"
            >
              ホームへ戻る
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### Step 3: `/app/google-drive-setup-verify/page.tsx` を作成

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function GoogleDriveSetupVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const verifyAndSave = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.provider_token) {
        const { data: { user } } = await supabase.auth.getUser();
        
        // profiles テーブルを更新
        await supabase
          .from('profiles')
          .update({
            google_drive_enabled: true,
            google_drive_auth_date: new Date().toISOString(),
          })
          .eq('id', user?.id);

        router.push('/google-drive-setup?success=true');
      } else {
        router.push('/google-drive-setup?error=true');
      }
    };

    verifyAndSave();
  }, [router]);

  return <div>認証処理中...</div>;
}
```

---

## 改善案 2: トークンをセキュアに保存する

### 現在の問題
- `provider_token` はクライアント側でアクセス可能（CORS リスク）
- セッション単位で管理されるため、長期保存がない

### 改善方法

#### Option A: OAuth Refresh Token を使用（推奨）

```typescript
// /app/auth/callback/route.ts

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // ✨ Google のリフレッシュトークンを安全に保存
      await supabase
        .from('auth_tokens')
        .upsert({
          user_id: data.session.user.id,
          provider: 'google',
          access_token: data.session.provider_token,
          refresh_token: data.session.provider_refresh_token, // 👈
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          updated_at: new Date().toISOString(),
        });

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
```

#### Step 1: Database にトークンテーブルを作成

```sql
CREATE TABLE auth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) DEFAULT 'google',
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Row Level Security
ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own tokens"
  ON auth_tokens FOR ALL
  USING (auth.uid() = user_id);
```

#### Step 2: トークン自動リフレッシュ API を作成

```typescript
// /app/api/auth/refresh-token/route.ts

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // DB からリフレッシュトークンを取得
  const { data: tokenData, error: tokenError } = await supabase
    .from('auth_tokens')
    .select('refresh_token, expires_at')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .single();

  if (tokenError || !tokenData?.refresh_token) {
    return NextResponse.json({ error: 'No refresh token found' }, { status: 401 });
  }

  // Google のトークンエンドポイントでリフレッシュ
  const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_SUPABASE_GOOGLE_CLIENT_ID!,
      client_secret: process.env.SUPABASE_GOOGLE_CLIENT_SECRET!,
      refresh_token: tokenData.refresh_token,
      grant_type: 'refresh_token',
    }).toString(),
  });

  const { access_token: newAccessToken, expires_in } = await refreshResponse.json();

  // DB 内のトークンを更新
  await supabase
    .from('auth_tokens')
    .update({
      access_token: newAccessToken,
      expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('provider', 'google');

  return NextResponse.json({ success: true, access_token: newAccessToken });
}
```

---

## 改善案 3: 次回以降アクセス時にトークンを再利用する

### フロー

```
1. ユーザーが /app/page.tsx を開く
2. Middleware で認証チェック
   ↓
3. トークンの有効期限チェック
   ├─ 有効 → 継続使用
   └─ 無効 → /api/auth/refresh-token で更新
   ↓
4. Google Drive からファイルリストを取得
5. セレクター UI で Google Drive ファイル選択可能に
```

### Step 1: カスタム Hook を作成

```typescript
// /app/hooks/useGoogleDriveAuth.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export function useGoogleDriveAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getValidToken = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.provider_token) {
        throw new Error('No session found');
      }

      // トークンの有効期限を確認（Supabase 側で管理）
      // 無効な場合は /api/auth/refresh-token を呼び出し
      
      const response = await fetch('/api/auth/check-token', { method: 'POST' });
      
      if (response.status === 401) {
        // トークンをリフレッシュ
        const refreshRes = await fetch('/api/auth/refresh-token', { method: 'POST' });
        const { access_token } = await refreshRes.json();
        return access_token;
      }

      return session.provider_token;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await getValidToken();
      setIsAuthenticated(!!token);
      setIsLoading(false);
    };

    checkAuth();
  }, [getValidToken]);

  return { isAuthenticated, isLoading, error, getValidToken };
}
```

### Step 2: Google Drive ファイルセレクター UI を追加

```typescript
// /app/components/GoogleDriveFilePicker.tsx

'use client';

import { useState, useEffect } from 'react';
import { useGoogleDriveAuth } from '../hooks/useGoogleDriveAuth';
import { Cloud, FileText } from 'lucide-react';

export default function GoogleDriveFilePicker() {
  const { isAuthenticated, getValidToken } = useGoogleDriveAuth();
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGoogleDriveFiles = async () => {
    setIsLoading(true);
    try {
      const token = await getValidToken();
      
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=mimeType='application/pdf'&pageSize=20&fields=files(id,name,mimeType,createdTime)`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      // ⚠️ CORS エラーを避けるため、サーバー経由にすべき
      // const response = await fetch('/api/google-drive/list-files');

      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Failed to fetch Google Drive files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchGoogleDriveFiles();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-200">
        <p className="text-sm font-bold text-slate-600">
          Google Drive の連携が必要です
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-black text-lg">Google Drive からファイルを選択</h3>
      
      {isLoading ? (
        <p className="text-slate-500">読み込み中...</p>
      ) : (
        <ul className="space-y-2">
          {files.map(file => (
            <li
              key={file.id}
              className="p-4 bg-white border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors flex items-center gap-3"
            >
              <FileText className="w-5 h-5 text-blue-500" />
              <span className="font-bold text-sm">{file.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Step 3: サーバーサイド Google Drive API エンドポイント

```typescript
// /app/api/google-drive/list-files/route.ts

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // DB からトークンを取得
    const { data: tokenData } = await supabase
      .from('auth_tokens')
      .select('access_token, expires_at')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .single();

    if (!tokenData?.access_token) {
      return NextResponse.json({ error: 'No token' }, { status: 401 });
    }

    // Google Drive API を呼び出し
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=mimeType='application/pdf'&pageSize=20&fields=files(id,name,createdTime)`,
      {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Google Drive API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

## 実装優先度

| # | 項目 | 難易度 | 価値 | 期間 |
|---|------|--------|------|------|
| 1 | Database スキーマ更新 | ⭐ | ⭐⭐⭐ | 30分 |
| 2 | `/google-drive-setup` ページ作成 | ⭐⭐ | ⭐⭐⭐ | 1時間 |
| 3 | OAuth Refresh Token 保存 | ⭐⭐⭐ | ⭐⭐⭐⭐ | 2時間 |
| 4 | トークン自動リフレッシュ API | ⭐⭐⭐ | ⭐⭐⭐ | 1.5時間 |
| 5 | Google Drive ファイルセレクター | ⭐⭐⭐⭐ | ⭐⭐ | 2時間 |

**推奨開始順序**: 1 → 2 → 3 → 4 → 5

---

## セキュリティチェックリスト

- [ ] `provider_token` をクライアント側で直接使用していない
- [ ] Refresh Token は DB に安全に保存している
- [ ] RLS (Row Level Security) を auth_tokens テーブルに設定
- [ ] API エンドポイントで認証チェックを実施
- [ ] API レスポンスにセンシティブ情報を含めない
- [ ] CORS ヘッダーを正しく設定している
- [ ] `calendar/page.tsx` の `provider_token` 使用を修正

