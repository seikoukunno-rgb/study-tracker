// app/terms/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約 | Mercury",
  description: "学習管理アプリ Mercury の利用規約です。",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <header className="mb-10 border-b border-slate-100 pb-6">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Mercury 利用規約
          </h1>
          <p className="mt-2 text-sm text-slate-500">制定日：2026年10月5日</p>
        </header>

        <article className="space-y-8 text-[15px] leading-relaxed text-slate-700">
          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第1条（適用）
            </h2>
            <p>
              1. 本利用規約（以下「本規約」という。）は、運営者が提供する学習管理アプリ「Mercury」（以下「本アプリ」という。）の利用条件を定めるものである。
              <br />
              2. 本規約は、本アプリを利用するすべての者（以下「ユーザー」という。）に適用される。
              <br />
              3. 運営者が本アプリ上で別途定める注意事項、ガイドラインその他の規定は、本規約の一部を構成する。本規約と矛盾する場合は、当該規定が優先する。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第2条（利用の開始）
            </h2>
            <p>
              1. ユーザーは、Googleアカウントでログインし、本規約に同意したうえで、本アプリの利用を開始するものとする。
              <br />
              2. ログインして利用を開始した時点で、ユーザーは本規約に同意したものとみなす。
              <br />
              3. 未成年者は、保護者の同意を得たうえで利用すること。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第3条（サービス内容）
            </h2>
            <p>本アプリは、次の機能を基本無料で提供する。</p>
            <ol className="mt-2 list-decimal space-y-1 pl-6">
              <li>PDFの閲覧、書き込み、注釈、検索</li>
              <li>学習時間・学習内容の記録、および学習状況のグラフ表示</li>
              <li>課題・やるべきことの管理（Todo）</li>
              <li>学習時間に応じたレベルアップ等の機能</li>
              <li>学習時間ランキング（すたらん）、ルーム、フォロワーなど、他のユーザーと交流する機能</li>
              <li>ユーザーが許可した場合のGoogleドライブとの連携</li>
              <li>その他、運営者が追加する機能</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第4条（利用料金）
            </h2>
            <p>
              本アプリは基本無料で提供する。ただし、運営者が一部の機能を有料とする場合は、事前にその内容および料金を本アプリまたはウェブサイト上で知らせる。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第5条（アカウントの管理）
            </h2>
            <p>
              ユーザーは、自己のGoogleアカウントおよび端末を、自己の責任で管理するものとする。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第6条（Googleアカウントおよび外部サービスとの連携）
            </h2>
            <p>
              1. 本アプリは、ユーザーが許可した範囲でのみ、Googleアカウントの情報（メールアドレス、氏名、プロフィール画像）およびGoogleドライブ上の、ユーザーが選択したファイルを利用する。
              <br />
              2. ユーザーは、Googleアカウントの設定画面から、いつでも本アプリへの許可を取り消すことができる。
              <br />
              3. 運営者は、Google、Supabase、Vercelなどの外部サービスを利用して本アプリを運営している。外部サービスの利用条件は、各提供者の定めるところによる。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第7条（禁止事項）
            </h2>
            <p>ユーザーは、次の行為をしてはならない。</p>
            <ol className="mt-2 list-decimal space-y-1 pl-6">
              <li>法令または公序良俗に違反する行為</li>
              <li>本アプリのサーバーやネットワークに過度な負荷をかける行為</li>
              <li>不正アクセス、またはその試み</li>
              <li>本アプリのスクレイピング、リバースエンジニアリング、その他の方法による解析</li>
              <li>他者の権利（知的財産権、プライバシー、名誉など）を侵害する行為</li>
              <li>本アプリの交流機能（ランキング、ルーム、フォロワー等）を通じて、他のユーザーに嫌がらせをし、または迷惑をかける行為</li>
              <li>本アプリを、運営者が意図しない方法で利用し、または第三者に不正に利用させる行為</li>
              <li>虚偽の学習記録を登録するなど、他のユーザーを欺く行為</li>
              <li>その他、運営者が不適切と判断する行為</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第8条（知的財産権）
            </h2>
            <p>
              本アプリおよびこれに付随する一切のコンテンツに関する知的財産権は、運営者または正当な権利者に帰属する。ユーザーは、これらを運営者の許可なく複製、転載、再配布してはならない。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第9条（ユーザーのデータおよび公開される情報）
            </h2>
            <p>
              1. ユーザーが本アプリに登録した学習記録その他のデータ（以下「ユーザーデータ」という。）の権利は、ユーザーに帰属する。
              <br />
              2. 運営者は、本アプリの提供・維持・改善に必要な範囲でのみ、ユーザーデータを利用する。
              <br />
              3. ランキング、ルーム、フォロワーなどの交流機能では、ユーザー名、学習時間その他の情報が、他のユーザーに表示される場合がある。ユーザーは、これに同意のうえ利用するものとする。
              <br />
              4. ユーザーデータの取扱いは、別に定めるプライバシーポリシーに従う。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第10条（データの保存）
            </h2>
            <p>
              運営者は、ユーザーデータの保存に努めるが、その消失・破損が生じないことを保証しない。重要なデータは、ユーザー自身でも控えを取ること。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第11条（サービスの変更・中断・終了）
            </h2>
            <p>
              1. 運営者は、保守、障害、不可抗力その他の事情により、事前の通知なく本アプリの全部または一部を中断することがある。
              <br />
              2. 運営者は、必要に応じて、本アプリの内容を変更し、または提供を終了することがある。終了する場合は、可能な限り事前に本アプリまたはウェブサイト上で知らせる。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第12条（利用の停止および退会）
            </h2>
            <p>
              1. 運営者は、ユーザーが本規約に違反した場合、事前の通知なく、そのユーザーの利用を停止することがある。
              <br />
              2. ユーザーは、第17条の連絡先に申し出ることにより、いつでも退会し、自己のデータの削除を求めることができる。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第13条（免責）
            </h2>
            <p>
              1. 本アプリは現状有姿で提供する。運営者は、本アプリの正確性、有用性、継続性、エラーがないことについて保証しない。
              <br />
              2. 本アプリの利用により学習の成果が得られることを、運営者は保証しない。
              <br />
              3. 交流機能を通じたユーザー間のトラブルについて、運営者は責任を負わない。ただし、運営者が必要と判断した場合は、対応を行うことがある。
              <br />
              4. 本アプリの中断、変更、終了、またはユーザーデータの消失・破損によってユーザーに生じた損害について、運営者は責任を負わない。
              <br />
              5. 運営者に故意または重大な過失がある場合には、本条および次条の免責・責任制限は適用されない。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第14条（責任の制限）
            </h2>
            <p>
              運営者がユーザーに対して損害賠償責任を負う場合でも、その範囲は、ユーザーに現実に生じた通常の直接損害に限る。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第15条（規約の変更）
            </h2>
            <p>
              1. 運営者は、必要に応じて本規約を変更することがある。
              <br />
              2. 変更後の規約は、本アプリまたはウェブサイトに掲載した時点から効力を生じる。重要な変更を行う場合は、掲載を通じて事前に知らせる。
              <br />
              3. 変更後に本アプリを利用した場合、ユーザーは変更後の規約に同意したものとみなす。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第16条（準拠法・管轄）
            </h2>
            <p>
              本規約は日本法に準拠する。本アプリに関して紛争が生じた場合は、民事訴訟法に定める管轄裁判所を第一審の裁判所とする。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">
              第17条（連絡先）
            </h2>
            <p>
              本規約および本アプリに関する問い合わせは、次の連絡先に行うこと。
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
            <a href="/privacy" className="font-bold text-indigo-600 underline underline-offset-2 hover:text-indigo-800">
              プライバシーポリシー
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
