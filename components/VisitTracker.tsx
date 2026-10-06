"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * サイト訪問の計測。
 * - ブラウザごとの匿名ID(localStorage)で「訪問者数」を数える（個人情報は送らない）
 * - 1ブラウザ・1セッション(タブを閉じるまで)につき1回だけ送信 → 通信は最小限
 * - /admin は計測しない
 * - 失敗してもアプリには影響させない
 */
export default function VisitTracker() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    try {
      if (sessionStorage.getItem("visit_sent") === "1") return;

      let id = localStorage.getItem("visitor_id");
      if (!id) {
        id =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
        localStorage.setItem("visitor_id", id);
      }
      sessionStorage.setItem("visit_sent", "1");

      Promise.resolve(supabase.rpc("record_visit", { p_visitor: id, p_path: pathname })).catch(() => {});
    } catch {
      /* ストレージが使えない環境では計測しない */
    }
  }, [pathname]);

  return null;
}
