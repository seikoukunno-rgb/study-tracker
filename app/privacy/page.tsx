// app/privacy/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー | Mercury",
  description:
    "学習管理アプリ Mercury のプライバシーポリシーです。取得する情報、Googleユーザーデータの取扱い、保存先、ユーザーの権利について記載しています。",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <header className="mb-10 border-b border-slate-100 pb-6">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Mercury プライバシーポリシー
          </h1>
          <p className="mt-2 text-sm text-slate-500">制定日：2026年10月5日</p>
        </header>

        <article className="space-y-8 text-[15px] leading-relaxed text-slate-700">
          <p>
            Mercury運営局（以下「運営者」という。）は、学習管理アプリ「Mercury」（以下「本アプリ」という。）におけるユーザーの個人情報およびデータの取扱いについて、本プライバシーポリシー（以下「本ポリシー」という。）を定める。
          </p>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第1条（基本方針）
            </h2>
            <p>
              運営者は、個人情報の保護に関する法律その他の関連法令、およびGoogle API Services User Data Policy（Limited Use の要件を含む。）を遵守し、必要な範囲で適正に個人情報を取り扱う。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第2条（取得する情報）
            </h2>
            <p>運営者は、次の情報を取得する。</p>
            <ol className="mt-2 list-decimal space-y-2 pl-6">
              <li>
                <span className="font-semibold">Googleアカウントの情報</span>
                <br />
                ユーザーがGoogleアカウントでログインする際に、メールアドレス、氏名、プロフィール画像を取得する。
              </li>
              <li>
                <span className="font-semibold">ユーザーが本アプリに登録する情報</span>
                <br />
                学習記録、学習時間、Todo、ルームやフォロワーに関する情報、設定情報など、ユーザーが本アプリ上で作成・登録する情報。
              </li>
              <li>
                <span className="font-semibold">Googleドライブに関する情報</span>
                <br />
                ユーザーがGoogleドライブ連携を許可し、ファイルを選択した場合に、そのファイルを表示するためのアクセス情報。
              </li>
              <li>
                <span className="font-semibold">技術情報</span>
                <br />
                本アプリの提供および不具合の把握のために、アクセス日時、利用環境などの情報を取得する場合がある。
              </li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第3条（Googleユーザーデータの取扱い）
            </h2>
            <p>
              <span className="font-semibold">1. 利用目的の限定</span>
              <br />
              本アプリが取得するGoogleユーザーデータ（メールアドレス、氏名、プロフィール画像、およびユーザーが選択したGoogleドライブ上のファイル）は、次の目的にのみ利用する。
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-6">
              <li>ユーザーの認証およびアカウントの識別</li>
              <li>ユーザーが選択したGoogleドライブ上のファイルを、本アプリ内で表示すること</li>
            </ol>
            <p className="mt-3">
              <span className="font-semibold">2. Limited Use の遵守</span>
              <br />
              運営者は、Googleユーザーデータを、広告、独自のAI・機械学習モデルの学習、または運営者もしくは第三者の別目的のために利用しない。
            </p>
            <p className="mt-3">
              <span className="font-semibold">3. Googleドライブのファイルについて</span>
              <br />
              本アプリは、ユーザーが選択したGoogleドライブ上のファイルを表示するのみであり、その内容を運営者のサーバーに保存しない。
            </p>
            <p className="mt-3">
              <span className="font-semibold">4. 権限の範囲</span>
              <br />
              本アプリは、ユーザーがGoogleドライブで選択したファイルにのみアクセスし、ドライブ内のその他のファイルにはアクセスしない。
            </p>
            <p className="mt-3">
              <span className="font-semibold">5. 連携の解除</span>
              <br />
              ユーザーは、Googleアカウントのセキュリティ設定（
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 underline underline-offset-2 hover:text-indigo-800"
              >
                https://myaccount.google.com/permissions
              </a>
              ）から、いつでも本アプリへの連携を解除できる。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第4条（情報の保存先）
            </h2>
            <p>
              1. ユーザーのログイン情報および学習データは、Supabase, Inc.（以下「Supabase」という。）の提供するデータベース（東京リージョン）に保存される。
              <br />
              2. 本アプリは、Vercel, Inc.（以下「Vercel」という。）のプラットフォーム上で提供される。
              <br />
              3. Googleドライブ上のファイルの内容は、運営者のサーバーに保存されない。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第5条（利用目的）
            </h2>
            <p>運営者は、取得した情報を次の目的で利用する。</p>
            <ol className="mt-2 list-decimal space-y-1 pl-6">
              <li>本アプリの提供、維持、および改善</li>
              <li>ユーザーの認証およびアカウントの管理</li>
              <li>学習記録の保存および表示</li>
              <li>ランキング、ルーム、フォロワーなどの交流機能の提供</li>
              <li>不正利用の防止および対応</li>
              <li>ユーザーからの問い合わせへの対応</li>
            </ol>
            <p className="mt-2">
              運営者は、上記の目的の範囲を超えて情報を利用しない。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第6条（他のユーザーに表示される情報）
            </h2>
            <p>
              本アプリの交流機能（ランキング、ルーム、フォロワーなど）では、ユーザー名、学習時間その他の一部の情報が、他のユーザーに表示される。ユーザーは、これを理解したうえで当該機能を利用するものとする。メールアドレスは、他のユーザーに表示されない。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第7条（第三者提供）
            </h2>
            <p>運営者は、次の場合を除き、個人情報を第三者に提供しない。</p>
            <ol className="mt-2 list-decimal space-y-1 pl-6">
              <li>ユーザーの同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>人の生命、身体または財産の保護のために必要であって、本人の同意を得ることが困難な場合</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第8条（外部サービスの利用）
            </h2>
            <p>
              運営者は、本アプリの運営のために、前条にかかわらず、Google、Supabase、Vercelなどの外部サービスを利用する。これらのサービスにおける情報の取扱いは、各提供者の定めるプライバシーポリシーに従う。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第9条（データの保存期間）
            </h2>
            <p>
              運営者は、利用目的の達成に必要な期間、情報を保存する。ユーザーが退会した場合、または削除の求めがあった場合は、法令で保存が義務付けられている場合を除き、その情報を速やかに削除する。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第10条（安全管理措置）
            </h2>
            <p>
              運営者は、情報の漏えい、滅失または毀損を防ぐため、通信の暗号化（HTTPS）、アクセス制御などの措置を講じる。ただし、インターネットを通じた情報の送受信において、完全な安全性を保証するものではない。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第11条（ユーザーの権利）
            </h2>
            <p>
              ユーザーは、自己の個人情報について、開示、訂正、利用停止、削除を求めることができる。これらを希望する場合は、第13条の連絡先に申し出ること。運営者は、本人からの求めであることを確認のうえ、適切に対応する。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第12条（本ポリシーの変更）
            </h2>
            <p>
              1. 運営者は、必要に応じて本ポリシーを変更することがある。
              <br />
              2. 変更後の本ポリシーは、本アプリまたはウェブサイトに掲載した時点から効力を生じる。重要な変更を行う場合は、掲載を通じて事前に知らせる。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第13条（連絡先）
            </h2>
            <p>
              本ポリシーおよび個人情報の取扱いに関する問い合わせは、次の連絡先に行うこと。
              <br />
              運営者：Mercury運営局
              <br />
              メール：admin.mercury@gmail.com
            </p>
          </section>
        </article>

        <footer className="mt-12 border-t border-slate-100 pt-6 text-sm text-slate-500">
          <p>制定日：2026年10月5日</p>
          <p className="mt-4">
            <a href="/terms" className="font-bold text-indigo-600 underline underline-offset-2 hover:text-indigo-800">
              利用規約
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
