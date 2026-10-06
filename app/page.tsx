// app/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LandingPage from "@/components/LandingPage";

function RootPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showLanding, setShowLanding] = useState(false);
  const [checking, setChecking] = useState(true);

  // ?site パラメータがあればログイン済みでもランディング表示
  const forceLanding = searchParams.get("site") !== null;

  useEffect(() => {
    if (forceLanding) {
      setShowLanding(true);
      setChecking(false);
      return;
    }

    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          router.replace("/home");
        } else {
          setShowLanding(true);
          setChecking(false);
        }
      } catch {
        setShowLanding(true);
        setChecking(false);
      }
    };
    check();
  }, [forceLanding, router]);

  if (checking && !showLanding) {
    return null;
  }

  return <LandingPage />;
}

export default function RootPage() {
  return (
    <Suspense fallback={null}>
      <RootPageInner />
    </Suspense>
  );
}
