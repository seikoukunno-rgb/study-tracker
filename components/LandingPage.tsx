"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import {
  FileText,
  PenTool,
  Calendar,
  ListTodo,
  Users,
  Trophy,
  TrendingUp,
  UserPlus,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  Globe,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";

/* ───────── Screens showcase ─────────
 * アプリの各画面を小さく横に流し見せる区画。
 * - 11枚のスクリーンショットを「電話フレーム」風にして横スクロールのマーキーで流す
 * - ホバー/タップで停止、クリックで拡大表示（ライトボックス）
 * - 普段は邪魔にならないよう、やや小さめ（高さ約360px）に収めて、興味がある人だけ見られる
 */
const SCREENS: { src: string; label: string }[] = [
  { src: "/screens/shelf.jpg", label: "本棚（教材一覧）" },
  { src: "/screens/search.jpg", label: "教材を検索" },
  { src: "/screens/report.jpg", label: "学習レポート" },
  { src: "/screens/timeline.jpg", label: "タイムライン・リアクション" },
  { src: "/screens/materials.jpg", label: "教材別の最終学習日" },
  { src: "/screens/calendar.jpg", label: "カレンダー・Todo" },
  { src: "/screens/rooms.jpg", label: "ルーム一覧" },
  { src: "/screens/chat.jpg", label: "ルーム内チャット" },
  { src: "/screens/starun.jpg", label: "スタラン ランキング" },
  { src: "/screens/connections.jpg", label: "フォロワー・フォロー" },
  { src: "/screens/mypage.jpg", label: "マイページ（レベル）" },
];

function PhoneFrame({ src, label, onClick }: { src: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative shrink-0 cursor-zoom-in focus:outline-none"
      aria-label={`${label}を拡大`}
    >
      {/* 電話フレーム */}
      <div className="relative h-[360px] w-[172px] rounded-[2.2rem] border border-slate-200/80 bg-white p-[6px] shadow-[0_18px_45px_-20px_rgba(37,99,235,0.35)] transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_28px_55px_-20px_rgba(37,99,235,0.5)]">
        <div className="relative h-full w-full overflow-hidden rounded-[1.75rem] bg-slate-100">
          <img src={src} alt={label} loading="lazy" className="h-full w-full object-cover object-top" />
        </div>
        {/* ノッチ風の飾り */}
        <div className="pointer-events-none absolute left-1/2 top-[8px] h-[8px] w-[52px] -translate-x-1/2 rounded-full bg-slate-900/85" />
      </div>
      {/* キャプション */}
      <div className="mt-4 flex justify-center">
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#475569] shadow-sm">
          {label}
        </span>
      </div>
    </button>
  );
}

function ScreensShowcase({ title, subtitle }: { title: string; subtitle: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [expanded, setExpanded] = useState(true); // 「表示を折りたたむ」で収納できる

  // 無限ループ用に2周ぶん並べる
  const loop = [...SCREENS, ...SCREENS];

  return (
    <section id="screens" className="relative overflow-hidden border-y border-slate-100 bg-gradient-to-b from-white via-slate-50/50 to-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex flex-col items-center text-center">
          <span className="mb-3 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">
            Screens
          </span>
          <h2 className="text-3xl font-bold md:text-5xl">{title}</h2>
          <p className="mt-3 max-w-xl text-sm text-[#64748B] md:text-base">{subtitle}</p>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-[#475569] shadow-sm transition-all hover:border-[#2563EB]/30 hover:text-[#2563EB]"
          >
            {expanded ? "画面プレビューを隠す" : "画面プレビューを見る"}
          </button>
        </div>

        {expanded && (
          <div
            className="relative"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* 左右フェード */}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent" />

            <div className="overflow-hidden">
              <div
                className="flex gap-8 py-6"
                style={{
                  width: "max-content",
                  animation: `screens-marquee 60s linear infinite`,
                  animationPlayState: paused ? "paused" : "running",
                }}
              >
                {loop.map((s, i) => (
                  <PhoneFrame key={i} src={s.src} label={s.label} onClick={() => setOpen(i % SCREENS.length)} />
                ))}
              </div>
            </div>

            <p className="mt-6 text-center text-[11px] font-bold tracking-widest text-[#94A3B8]">
              TAP / CLICK TO ENLARGE
            </p>
          </div>
        )}
      </div>

      {/* ライトボックス */}
      {open !== null && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-6 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setOpen(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => (o === null ? o : (o - 1 + SCREENS.length) % SCREENS.length));
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-md transition-all hover:bg-white/20 md:left-10"
            aria-label="前の画面"
          >
            <ArrowRight className="h-5 w-5 rotate-180" />
          </button>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <div className="relative h-[70vh] max-h-[720px] w-auto rounded-[2.5rem] border border-white/10 bg-white p-[8px] shadow-2xl">
              <div className="relative h-full w-auto overflow-hidden rounded-[2rem]" style={{ aspectRatio: "9 / 19.5" }}>
                <img src={SCREENS[open].src} alt={SCREENS[open].label} className="h-full w-full object-cover object-top" />
              </div>
            </div>
            <div className="mt-4 text-center text-sm font-bold tracking-wide text-white">
              {SCREENS[open].label}
              <span className="ml-3 text-[11px] font-normal text-white/50">
                {open + 1} / {SCREENS.length}
              </span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => (o === null ? o : (o + 1) % SCREENS.length));
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-md transition-all hover:bg-white/20 md:right-10"
            aria-label="次の画面"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => setOpen(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white backdrop-blur-md transition-all hover:bg-white/20 md:right-10 md:top-10"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes screens-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}

/* ───────── i18n ───────── */
const t: Record<string, Record<string, string>> = {
  ja: {
    "nav.features": "機能紹介",
    "nav.trust": "安全性",
    "nav.faq": "よくある質問",
    "nav.start": "今すぐはじめる",
    "hero.badge": "Study Next Generation",
    "hero.title1": "学習を、",
    "hero.accent": "もっと見える化。",
    "hero.title2": "もっと続けやすく。",
    "hero.desc":
      "PDF教材、予定、仲間との競争。学習に必要なすべてをひとつに集約。Mercuryは「続けられない自分」を卒業するための、デジタル学習基地です。",
    "hero.cta": "Mercuryをはじめる",
    "abstract.title": "なぜ、Mercuryなのか？",
    "abstract.r1t": "PDFを「そのまま」デジタルノートに",
    "abstract.r1d":
      "重い参考書を持ち運ぶ必要はありません。お手元のPDFをアップロードするだけで、どこでも学習可能な環境が整います。",
    "abstract.r2t": "孤独な学習を「共有」の喜びに",
    "abstract.r2d":
      "同じ目標を持つ仲間とつながり、学習時間を共有。ランキングやログ機能があなたのモチベーションを支えます。",
    "abstract.r3t": "データに基づいた「継続」の設計",
    "abstract.r3d":
      "学習パターンを分析し、最適な復習タイミングや、次にやるべきことを提案します。",
    "screens.title": "画面でわかるMercury",
    "screens.subtitle": "記録・レポート・ルーム・スタラン。実際の画面をそのままどうぞ。",
    "features.title": "最強の学習環境を、その手に。",
    "features.c1t": "PDF Smart Viewer",
    "features.c1d":
      "書き込み、注釈、検索。PDF学習に特化した高速・高機能ビューア。",
    "features.c2t": "Social Ranking",
    "features.c2d":
      "孤独な勉強をチーム戦に。仲間と切磋琢磨できるランキング機能。",
    "features.c3t": "Data Analytics",
    "features.c3d":
      "積み上げた努力をグラフで。学習時間と成果を可視化して自信に繋げる。",
    "trust.title": "信頼と透明性のための、Mercuryの約束。",
    "trust.pdf_title": "PDF書き込みの仕組みについて",
    "trust.pdf1":
      "MercuryのPDF書き込み機能は、「元のPDFファイル自体を編集・改変することはない」という設計思想のもとに作られています。",
    "trust.pdf2":
      "あなたのメモや書き込みは独自のデータレイヤーとして保存され、ブラウザやアプリ上で重ねて表示されます。これにより、大切なファイルを汚すことなく、何度でも新しく解法を試すことが可能です。",
    "faq.title": "よくある質問",
    "faq.q1": "利用料金はかかりますか？",
    "faq.a1":
      "基本機能は無料でご利用いただけます。将来的に、高度な分析機能などを備えたプレミアムプランを提供予定です。",
    "faq.q2": "スマホやタブレットでも使えますか？",
    "faq.a2":
      "はい。Webアプリとして設計されているため、ブラウザがあればどのデバイスからでも学習を再開できます。",
    "faq.q3": "PDF以外のファイルも読み込めますか？",
    "faq.a3":
      "現在はPDFに特化していますが、順次画像ファイル（JPEG/PNG）などへの対応も進めています。",
    "footer.desc":
      "学習のログ、仲間との繋がり。Mercuryは、あなたの「学びたい」を「続く」に変えるエコシステムです。",
    "footer.product": "プロダクト",
    "footer.company": "規約・ポリシー",
    "footer.privacy": "プライバシーポリシー",
    "footer.terms": "利用規約",
    "footer.contact": "お問い合わせ",
    "voice":
      "「今まで使った中で一番、勉強がゲームみたいに楽しくなった。」",
    "voice.user": "慶應義塾大学 / 1年生",
    "voice.exp": "Mercury歴: 3ヶ月",
    "cta.final": "さあ、学習を「楽しさ」へ。",
    "lang.toggle": "English",
  },
  en: {
    "nav.features": "Features",
    "nav.trust": "Trust",
    "nav.faq": "FAQ",
    "nav.start": "Get Started",
    "hero.badge": "Study Next Generation",
    "hero.title1": "Study,",
    "hero.accent": "Visualized.",
    "hero.title2": "Stay Consistent.",
    "hero.desc":
      "PDF materials, schedules, and friendly competition. All your study essentials in one place. Mercury is your digital study hub designed to help you stay focused and consistent.",
    "hero.cta": "Start Mercury",
    "abstract.title": "Why Mercury?",
    "abstract.r1t": "Turn PDFs into Digital Notes",
    "abstract.r1d":
      "No need to carry heavy textbooks. Simply upload your PDFs and create a study environment accessible anywhere.",
    "abstract.r2t": "Share the Joy of Learning",
    "abstract.r2d":
      "Connect with peers sharing the same goals. Ranking and log features support your motivation through community.",
    "abstract.r3t": "Designed for Consistency",
    "abstract.r3d":
      "Analytics help you understand your patterns and suggest optimal review timings for better results.",
    "screens.title": "See Mercury in Action",
    "screens.subtitle": "Record, report, rooms, Starun. Take a look at the actual screens.",
    "features.title": "The Ultimate Study Environment.",
    "features.c1t": "PDF Smart Viewer",
    "features.c1d":
      "Annotate, search, and manage. A high-performance viewer specialized for digital learning.",
    "features.c2t": "Social Ranking",
    "features.c2d":
      "Turn solo study into a team effort. Compete and grow with friends through rankings.",
    "features.c3t": "Data Analytics",
    "features.c3d":
      "Visualize your effort. See your study time and achievements in clear charts to boost confidence.",
    "trust.title": "Mercury's Promise for Trust and Transparency.",
    "trust.pdf_title": "How PDF Annotation Works",
    "trust.pdf1":
      'Mercury\'s annotation feature is designed based on the principle that "the original PDF file itself is never modified."',
    "trust.pdf2":
      "Your notes and annotations are saved as a separate data layer and overlaid in the browser. This allows you to try problems as many times as you like without altering the original file.",
    "faq.title": "Frequently Asked Questions",
    "faq.q1": "Is it free to use?",
    "faq.a1":
      "Basic features are available for free. We plan to offer a premium plan with advanced analysis features in the future.",
    "faq.q2": "Can I use it on smartphones or tablets?",
    "faq.a2":
      "Yes. As it is a web-based application, you can resume your studies from any device with a web browser.",
    "faq.q3": "Can I load files other than PDF?",
    "faq.a3":
      "Currently, we specialize in PDF, but we are working on support for image files (JPEG/PNG) and other formats.",
    "footer.desc":
      "Study logs, peer connection. Mercury is an ecosystem that turns your desire to learn into consistent action.",
    "footer.product": "Product",
    "footer.company": "Legal",
    "footer.privacy": "Privacy Policy",
    "footer.terms": "Terms of Service",
    "footer.contact": "Contact",
    "voice":
      '"The best tool I\'ve used. It turned studying into something as fun as a game."',
    "voice.user": "Keio University / 1st Year",
    "voice.exp": "Mercury user: 3 months",
    "cta.final": "Let's make studying fun.",
    "lang.toggle": "日本語",
  },
};

/* ───────── Feature card ───────── */
function FeatureCard({
  icon: Icon,
  title,
  description,
  badge,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-8 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
      <div className="absolute -mr-16 -mt-16 right-0 top-0 h-32 w-32 rounded-full bg-[#2563EB]/5 blur-3xl transition-all group-hover:bg-[#2563EB]/10" />
      <div className="mb-6 inline-flex rounded-2xl bg-slate-50 p-4 text-[#2563EB] transition-all duration-300 group-hover:bg-[#2563EB] group-hover:text-white">
        <Icon size={28} />
      </div>
      {badge && (
        <span className="absolute right-8 top-8 rounded-md border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#7C3AED]">
          {badge}
        </span>
      )}
      <h3 className="mb-4 text-xl font-bold text-[#0F172A] transition-colors group-hover:text-[#2563EB]">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-[#64748B]">{description}</p>
    </div>
  );
}

/* ───────── Main component ───────── */
export default function LandingPage() {
  const [lang, setLang] = useState<"ja" | "en">("ja");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [ctaHref, setCtaHref] = useState("/login");

  const g = (key: string) => t[lang][key] ?? key;

  // スクロールで nav の見た目を変える
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // ログイン済みなら CTA をアプリ(/home)へ、未ログインなら /login へ
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active && data.user) setCtaHref("/home");
    });
    return () => {
      active = false;
    };
  }, []);

  const features = [
    { icon: FileText, title: g("features.c1t"), description: g("features.c1d") },
    { icon: PenTool, title: g("features.c2t"), description: g("features.c2d"), badge: "Safe" },
    { icon: Calendar, title: g("features.c3t"), description: g("features.c3d") },
    { icon: ListTodo, title: "Todoリスト", description: "一日のやるべき事を最小単位に分解。" },
    { icon: Users, title: "ルーム機能", description: "同じ目標の仲間とルームを作成。" },
    { icon: Trophy, title: "スタラン", description: "勉強時間ランキング機能。" },
    { icon: TrendingUp, title: "レベルアップ", description: "学習時間＝経験値システム。" },
    { icon: UserPlus, title: "フォロー・交流", description: "高め合えるSNS体験。" },
  ];

  const reasons = [
    { color: "text-[#2563EB]", title: g("abstract.r1t"), desc: g("abstract.r1d") },
    { color: "text-[#06B6D4]", title: g("abstract.r2t"), desc: g("abstract.r2d") },
    { color: "text-[#7C3AED]", title: g("abstract.r3t"), desc: g("abstract.r3d") },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8FAFC] text-[#0F172A]" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      {/* ─── Google Fonts ─── */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap"
        rel="stylesheet"
      />

      {/* ═══════════ NAV ═══════════ */}
      <nav
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? "border-b border-black/5 bg-white/60 py-3 shadow-sm backdrop-blur-xl" : "py-6"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
          {/* Logo */}
          <Link href="/" className="group flex cursor-pointer items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#2563EB]/20 blur-lg transition-all group-hover:bg-[#2563EB]/40" />
              <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/50 bg-white/80 shadow-xl backdrop-blur-sm transition-transform duration-500 group-hover:scale-110">
                <Image src="/logo.png" alt="Mercury" width={48} height={48} className="h-full w-full object-contain p-1" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black leading-none tracking-tighter" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
                Mercury
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2563EB] opacity-60">
                Study Ecosystem
              </span>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-8 text-sm font-medium text-[#64748B] md:flex">
            <a href="#features" className="transition-colors hover:text-[#2563EB]">{g("nav.features")}</a>
            <a href="#trust" className="transition-colors hover:text-[#2563EB]">{g("nav.trust")}</a>
            <a href="#faq" className="transition-colors hover:text-[#2563EB]">{g("nav.faq")}</a>
            <button
              onClick={() => setLang(lang === "ja" ? "en" : "ja")}
              className="flex items-center gap-2 rounded-full px-3 py-1.5 font-bold text-[#0F172A] transition-all hover:bg-slate-100"
            >
              <Globe size={18} />
              {g("lang.toggle")}
            </button>
            <Link
              href={ctaHref}
              className="rounded-full bg-[#0F172A] px-6 py-2 font-bold text-white shadow-md transition-all hover:scale-105 hover:bg-[#2563EB] active:scale-95"
            >
              {g("nav.start")}
            </Link>
          </div>

          {/* Mobile toggle */}
          <div className="flex items-center gap-4 md:hidden">
            <button onClick={() => setLang(lang === "ja" ? "en" : "ja")} className="rounded-full p-2 text-[#0F172A] transition-all hover:bg-slate-100">
              <Globe size={22} />
            </button>
            <button className="text-[#0F172A]" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="absolute left-0 right-0 top-full flex flex-col items-center gap-6 border-t border-black/5 bg-white/60 px-6 py-8 text-center shadow-xl backdrop-blur-xl md:hidden">
            <a href="#features" className="text-lg text-[#0F172A]" onClick={() => setMobileOpen(false)}>{g("nav.features")}</a>
            <a href="#trust" className="text-lg text-[#0F172A]" onClick={() => setMobileOpen(false)}>{g("nav.trust")}</a>
            <a href="#faq" className="text-lg text-[#0F172A]" onClick={() => setMobileOpen(false)}>{g("nav.faq")}</a>
            <Link
              href={ctaHref}
              onClick={() => setMobileOpen(false)}
              className="w-full rounded-xl bg-gradient-to-r from-[#2563EB] to-[#06B6D4] py-4 font-bold text-white"
            >
              {g("nav.start")}
            </Link>
          </div>
        )}
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative px-6 pb-20 pt-32 md:pb-40 md:pt-48">
        <div className="mx-auto max-w-7xl text-center">
          <div className="animate-[fadeUp_0.8s_ease-out]">
            <span className="mb-8 inline-block rounded-full border border-[#2563EB]/10 bg-[#2563EB]/5 px-4 py-1.5 text-sm font-bold uppercase tracking-widest text-[#2563EB]">
              {g("hero.badge")}
            </span>
            <h1
              className="mb-8 text-5xl font-bold leading-[1.1] tracking-tight md:text-8xl md:leading-[1.05]"
              style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
            >
              {g("hero.title1")}
              <span className="bg-gradient-to-r from-[#2563EB] via-[#06B6D4] to-[#7C3AED] bg-clip-text text-transparent">
                {g("hero.accent")}
              </span>
              <br />
              {g("hero.title2")}
            </h1>
            <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-[#64748B] md:text-xl">
              {g("hero.desc")}
            </p>
          </div>

          {/* Logo showcase */}
          <div className="relative mt-32 animate-[fadeUp_1.2s_ease-out]">
            <div className="absolute left-1/2 top-1/2 -z-10 h-96 w-96 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-[#2563EB]/10 blur-[120px]" />
            <div className="group relative mb-16 inline-block">
              <div className="absolute -inset-8 rounded-[4rem] bg-gradient-to-tr from-[#2563EB]/20 to-[#7C3AED]/20 opacity-0 blur-3xl transition-opacity duration-1000 group-hover:opacity-100" />
              <div className="relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-[3.5rem] border border-white/80 bg-white p-6 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] transition-transform duration-1000 ease-out group-hover:scale-105 md:h-72 md:w-72">
                <Image src="/logo.png" alt="Mercury" width={288} height={288} className="h-full w-full object-contain" />
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-6 md:flex-row">
              <Link
                href={ctaHref}
                className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-[#0F172A] px-12 py-5 text-xl font-bold text-white shadow-2xl transition-all hover:scale-105 active:scale-95 md:w-auto"
              >
                {g("hero.cta")}
                <ArrowRight size={22} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ ABSTRACT ═══════════ */}
      <section className="relative z-10 border-y border-slate-100 bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-16 md:grid-cols-2">
            <div>
              <h2 className="mb-8 text-3xl font-bold leading-tight md:text-5xl">{g("abstract.title")}</h2>
              <div className="space-y-8">
                {reasons.map((r, i) => (
                  <div key={i} className="flex gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 ${r.color}`}>
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h4 className="mb-2 text-xl font-bold">{r.title}</h4>
                      <p className="text-[#64748B]">{r.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* User voice (desktop only) */}
            <div className="relative hidden md:block">
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#2563EB]/10 to-[#7C3AED]/10 blur-[80px]" />
              <div className="rounded-[3rem] border border-slate-100 bg-white p-10 text-center shadow-xl">
                <div className="mb-2 text-sm font-bold uppercase tracking-widest text-[#2563EB]">User Voices</div>
                <p
                  className="mb-8 text-2xl font-medium italic leading-relaxed"
                  style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                >
                  {g("voice")}
                </p>
                <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED]" />
                  <div>
                    <div className="font-bold">{g("voice.user")}</div>
                    <div className="text-xs text-[#64748B]">{g("voice.exp")}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section id="features" className="px-6 py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mb-20 text-center">
            <h2 className="text-3xl font-bold md:text-6xl">{g("features.title")}</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <FeatureCard key={i} icon={f.icon} title={f.title} description={f.description} badge={f.badge} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ SCREENS ═══════════ */}
      <ScreensShowcase title={g("screens.title")} subtitle={g("screens.subtitle")} />

      {/* ═══════════ TRUST ═══════════ */}
      <section id="trust" className="relative overflow-hidden border-y border-slate-100 bg-slate-50 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="relative mb-12 inline-block">
            <div className="absolute inset-0 scale-150 rounded-full bg-[#2563EB]/20 blur-2xl" />
            <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl">
              <Image src="/logo.png" alt="Mercury" width={96} height={96} className="h-full w-full p-5" />
            </div>
          </div>
          <h2 className="mb-8 text-3xl font-bold md:text-5xl">{g("trust.title")}</h2>
          <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 text-left shadow-xl md:p-12">
            <h3 className="mb-6 flex items-center gap-3 text-2xl font-bold">
              <span className="h-6 w-1.5 rounded-full bg-[#2563EB]" />
              {g("trust.pdf_title")}
            </h3>
            <p className="mb-8 font-medium leading-loose">
              <span className="font-bold text-[#2563EB]">{g("trust.pdf1")}</span>
              <br /><br />
              <span className="font-normal text-[#64748B]">{g("trust.pdf2")}</span>
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section id="faq" className="px-6 py-32">
        <div className="mx-auto max-w-3xl">
          <div className="mb-20 flex items-center justify-center gap-4 text-center">
            <HelpCircle className="text-[#2563EB]" size={32} />
            <h2 className="text-4xl font-bold">{g("faq.title")}</h2>
          </div>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]"
              >
                <h4 className="mb-4 flex gap-4 text-xl font-bold">
                  <span className="text-[#2563EB]">Q.</span> {g(`faq.q${i}`)}
                </h4>
                <p className="pl-10 leading-relaxed text-[#64748B]">{g(`faq.a${i}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="relative px-6 py-40">
        <div className="absolute left-1/2 top-1/2 -z-10 h-80 w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#2563EB]/5 to-[#7C3AED]/5 blur-[120px]" />
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[4rem] bg-[#0F172A] px-10 py-20 text-center shadow-2xl">
          <h2
            className="mb-8 text-4xl font-bold italic leading-tight text-white md:text-6xl"
            style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
          >
            {g("cta.final")}
          </h2>
          <div className="flex flex-col items-center justify-center gap-4 md:flex-row">
            <Link
              href={ctaHref}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-12 py-5 text-xl font-bold text-[#0F172A] shadow-xl transition-all hover:scale-105 hover:bg-[#06B6D4] hover:text-white active:scale-95 md:w-auto"
            >
              {g("hero.cta")} <ArrowRight size={24} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="shrink-0 border-t border-slate-100 bg-white px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-20 grid gap-12 md:grid-cols-2 lg:grid-cols-4">
            <div className="col-span-2">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-white">
                  <Image src="/logo.png" alt="Mercury" width={32} height={32} className="h-full w-full object-contain" />
                </div>
                <span
                  className="text-2xl font-bold tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                >
                  Mercury
                </span>
              </div>
              <p className="mb-8 max-w-sm leading-relaxed text-[#64748B]">{g("footer.desc")}</p>
            </div>
            <div>
              <h5 className="mb-6 font-bold">{g("footer.product")}</h5>
              <ul className="space-y-4 text-sm font-medium text-[#64748B]">
                <li><a href="#features" className="transition-colors hover:text-[#2563EB]">{g("nav.features")}</a></li>
                <li><a href="#trust" className="transition-colors hover:text-[#2563EB]">{g("nav.trust")}</a></li>
                <li><a href="#faq" className="transition-colors hover:text-[#2563EB]">{g("nav.faq")}</a></li>
              </ul>
            </div>
            <div>
              <h5 className="mb-6 font-bold">{g("footer.company")}</h5>
              <ul className="space-y-4 text-sm font-medium text-[#64748B]">
                <li><Link href="/terms" className="transition-colors hover:text-[#2563EB]">{g("footer.terms")}</Link></li>
                <li><Link href="/privacy" className="transition-colors hover:text-[#2563EB]">{g("footer.privacy")}</Link></li>
                <li><a href="mailto:admin.mercury@gmail.com" className="transition-colors hover:text-[#2563EB]">{g("footer.contact")}</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-10 text-xs text-slate-400 md:flex-row">
            <p>&copy; 2026 Mercury Project. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="flex items-center gap-1"><ShieldCheck size={12} /> Verified for Google Drive</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── animations ─── */}
      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
