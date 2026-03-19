import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 🌟 1. マッチング設定
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};

// 🌟 2. 関数名を "middleware" から "proxy" に変更！
// Next.js 16の proxy.ts では、関数名もファイル名に合わせる必要があります
export function proxy(request: NextRequest) {
  // 現在は全てのアクセスを許可する設定です
  return NextResponse.next();
}