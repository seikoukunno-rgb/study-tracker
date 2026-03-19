import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET() {
  // 本来は認証セッションからトークンを取得しますが、
  // まずはAPIが動作する構造を定義します。
  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    // TODO: ここでユーザーのアクセストークンをセットします
    // 認証フローは次のステップで組み込みます。

    return NextResponse.json({ message: "Gmail API Ready" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}