# Google Drive連携の調査・修正

## 調査結果

実装を全体検索し、OAuthの入口、callback、PDF一覧、PDF配信、教材登録、教材表示、Supabase認証、PWAを確認した。

- `app/api/auth/google-drive-link/route.ts`、`app/login/page.tsx`、`app/page.tsx` に旧 `drive.readonly` 要求が残っていた。Google Cloud側で公開したスコープと、アプリが実際に要求するスコープは別である。
- PDF一覧APIは `files.list` で全PDFを取得する設計だった。`drive.file` はアプリが作成したファイル、またはユーザーがPicker等で許可したファイルだけにアクセスできる。認証済みでも未許可PDFは一覧に現れない。
- Pickerがなく、既存DriveのPDFを許可する手段がなかった。
- 一覧取得失敗時にファイル配列を空にし、エラーと「PDFファイルが見つかりません」を同時表示していた。
- 連携情報は `user_connected_google_accounts` の `user_id / google_email / refresh_token`。連携済み表示はレコードの存在だけを示し、トークンの有効性・権限を保証していなかった。
- 独立Drive OAuthはrefresh tokenのみを保存し、各APIでaccess tokenを都度生成していた。access tokenの永続化はなく、更新処理は重複していた。旧refresh tokenを更新しても新しい権限には自動移行しない。
- 複数アカウントは `materials.connected_account_id` と `file_account_map` でファイルに対応付けられている。PDF配信でもアカウントIDを使用する。
- Drive callback自体にlocalhostや旧Vercelドメインの直書きはなかったが、request originに依存していた。共有URLには旧Vercelドメインが残っていた。
- PWAの既定APIキャッシュはアカウント別Drive一覧・PDFにも適用されていた。

本番のGoogle API応答・保存済みトークン・Google Cloud/Supabase設定にはアクセスしていないため、「取得失敗」を起こした個別のHTTPエラー（失効、クライアント不一致、API無効化等）は未確定。上記のスコープ不整合と選択導線の欠如はコードから確認できた原因である。

## 修正

- Drive OAuthを `drive.file + userinfo.email + userinfo.profile + openid` に統一。通常GoogleログインからDrive権限要求を除き、教材追加は独立Drive連携画面に誘導する。
- OAuthにstate、セッションユーザー照合、PKCE、有効期限付きHttpOnly cookieを追加。callbackは許可されたDriveスコープを確認する。
- 同一 `user_id,google_email` でupsertし、既存IDと教材のアカウント対応を維持。新refresh tokenが返らない場合は、同一アカウントの既存tokenがdrive.fileを持つことを確認して再利用。
- `lib/google-drive/server.ts` に設定・所有者確認・refresh・エラー応答を共通化。refresh token/Client Secret/Google応答本文をログやAPI応答に出さない。
- `POST /api/google-drive/picker` はログインユーザーに属するアカウントの短期access token、Picker API key、project numberだけを返す。refresh tokenは返さない。旧スコープは再連携を案内する。
- PickerはそのアカウントのtokenでPDFのみを複数選択する。既存の教材登録とファイル別アカウント対応、PDFビューア・書き込み処理を維持。
- 一覧は許可済みPDFの再利用用。ゴミ箱を除外し、ページングし、`isAppAuthorized` で旧広域権限からの全Drive表示を防ぐ。Googleログインtokenをヘッダーで渡す旧一覧経路は廃止。
- 一覧エラーと空一覧を区別。失効・旧スコープ・権限不足・削除済みファイルを案内。アカウント切り替え時は古い一覧リクエストを中断する。
- PDF APIは既存のSupabaseセッションtoken経路を維持し、PDFのContent-Typeを確認してストリーム配信する。権限エラーをtoken失効と混同しない。
- PWAは継続し、Drive・認証APIをNetworkOnlyにする。共有URLは現在のoriginを使う。
- 旧設計書 `GOOGLE_DRIVE_INTEGRATION_PLAN.md` は参考履歴であり、現行仕様にはこの文書を使用する。

## 本番で必要な設定（この作業では変更・公開していない）

Google Cloudで、OAuth Client、Drive API、Picker API、API keyを同じプロジェクトに揃える。

1. Google Drive APIとGoogle Picker APIを有効にする。
2. Picker用API keyを作成する。Webサイト制限は `https://mercury-study47.com/*` と `https://docs.google.com/*`。API制限はGoogle Picker API。ローカル動作を確認する場合だけ開発originも追加する。
3. 本番環境変数に `GOOGLE_PICKER_API_KEY` と `GOOGLE_CLOUD_PROJECT_NUMBER`（プロジェクトID文字列ではなく数値のプロジェクト番号）を設定する。
4. `APP_URL=https://mercury-study47.com` を設定する。未設定時はリクエストoriginを利用するため、プロキシ環境では明示設定を推奨する。
5. 既存 `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` が保存済みrefresh token発行元と同じOAuth Clientであることを確認する。異なるClientへ移行したアカウントは再連携が必要。
6. 独立Drive OAuth Clientの承認済みredirect URIは `https://mercury-study47.com/api/auth/google-drive-callback`。承認済みJavaScript originは `https://mercury-study47.com`。
7. 通常のGoogleログインはSupabase OAuthを使用するため、Google Cloud側のSupabase callback URIを維持し、SupabaseのSite URL/Redirect allowlistに本番URLと `/auth/callback` を設定する。独立Drive callbackとは別経路。

API keyはPicker動作時にブラウザーへ渡る公開用キー。制限付きで使用する。Client Secretとrefresh tokenはサーバーだけで扱う。秘密値をこの文書・ソース・検証ログに記載しない。

## Supabase整合性と移行

DBスキーマ変更は不要。既存の `user_connected_google_accounts`、`materials` を使用する。既存の `(user_id, google_email)` 一意制約と連携レコードIDを維持する。実DBの制約・RLSは未検証。連携情報に対するSELECT/INSERT/UPDATE/DELETEは `auth.uid() = user_id`、教材は `auth.uid() = student_id` に制限されていることを管理画面で確認する。サーバーもアカウント取得をユーザーIDで制限する。

旧Drive権限のアカウントは「再連携」から**同じGoogleメールアドレス**を選ぶ。連携解除して再作成すると教材に保存されたIDが変わるため、移行には解除を使わない。旧権限だけで参照していたPDFはPickerで同じファイルを選び直して許可する。選び直してもGoogle DriveのファイルIDは変わらず、既存教材を参照できる。メインSupabase Googleログインだけを使う旧教材は、必要に応じて独立Drive連携で再登録する。

## 検証

- `npx tsc --noEmit`: 成功。
- `npm run build`: 成功（Next.js 16 / webpack、静的生成を含む）。
- `node --test tests/google-drive.test.cjs`: 14件成功。所有者制限、失効、旧スコープ、ページング、権限エラー、Pickerの短期token、cross-origin拒否、PDF配信、state/PKCE、本番callback、再連携のupsertを検証。
- Driveの新規/修正API、共通処理、連携画面、回帰テストのESLint: エラー0。既存の画像タグ警告2件。
- 全体lintは既存エラーで失敗。HEADを一時ディレクトリに展開した比較では、修正前166エラー/108警告、修正後154エラー/105警告。今回の対象外の既存any、React effect等と生成済みPWAファイルが主な指摘。生成ファイルはビルドによる差分を戻した。

実アカウントでのPicker表示、Googleの同意画面、Supabase書き込み、PDF描画・注釈保存、PWAの実機動作は、上記設定を揃えた環境で確認が必要。

確認手順: 2アカウントをそれぞれ再連携 → 未許可PDFをPickerで選択 → 両方のアカウントから複数PDFを同じ教材に登録 → タイマー画面で全PDF切替・注釈保存 → 再読み込み → アカウント別許可済み一覧と既存教材を再表示。キャンセル、失効、削除・共有解除、他ユーザーのaccountId、PWAの再起動も確認する。

Google公式資料:
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- https://developers.google.com/workspace/drive/picker/guides/web-picker
- https://developers.google.com/workspace/drive/picker/reference/picker.pickerbuilder.setappid


## 変更ファイル一覧

| ファイル | 変更内容 |
| --- | --- |
| `app/api/auth/google-drive-link/route.ts` | drive.file、state/PKCE、ログイン確認、callback origin |
| `app/api/auth/google-drive-callback/route.ts` | state/ユーザー/スコープ検証、同一IDを保つ再連携、秘密ログ除去 |
| `app/api/google-drive/list/route.ts` | 許可済みPDF一覧、ページング、権限・失効エラー |
| `app/api/google-drive/picker/route.ts`（新規） | アカウント別の短期tokenとPicker設定提供 |
| `app/api/drive/route.ts` | 共通token処理、PDFストリーム配信、エラー分類 |
| `lib/google-drive/server.ts`（新規） | サーバー認証・token更新・所有者チェック |
| `lib/google-drive/picker.ts`（新規） | Picker読み込み、PDF複数選択、キャンセル |
| `app/google-drive-setup/page.tsx` | Picker導線、複数アカウント維持、誤った空一覧表示の修正 |
| `app/login/page.tsx` | 通常ログインから旧Drive権限要求を除去 |
| `app/home/page.tsx` | 教材追加をDrive選択画面へ誘導、古いlocalStorage連携判定を除去 |
| `app/timer/page.tsx` | PDF APIの具体的なエラー表示 |
| `components/GlobalSidebar.tsx` | 旧Vercel共有URLを現在のoriginへ変更 |
| `next.config.ts` | Drive・認証APIのPWAキャッシュ除外 |
| `next-pwa.d.ts` | PWAキャッシュ設定の型宣言 |
| `tests/google-drive.test.cjs`（新規） | 14件の回帰テスト |
| `GOOGLE_DRIVE_FIX.md`（新規） | 調査結果、設定、移行、検証、変更一覧 |
| `GOOGLE_DRIVE_INTEGRATION_PLAN.md` | 旧設計書であることと現行文書への参照を明示 |


## origin/mainへの反映時の整合

リモートmainでアプリ本体が `/home` に移動済みだったため、教材追加処理の変更を `app/home/page.tsx` に適用し、登録後の戻り先を `/home` に揃えた。ルートのランディングページ、法務ページ、カレンダー連携の除去などリモート側の変更を維持してrebaseした。変更対象は17ファイルのまま。
