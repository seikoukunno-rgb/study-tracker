// app/page.tsx
// ルート（mercury-study47.com）は、ログイン状態に関わらず常にランディングページを表示する。
import LandingPage from "@/components/LandingPage";

export default function RootPage() {
  return <LandingPage />;
}
