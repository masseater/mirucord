import type { ReactNode } from "react";

import { LegalDocument } from "./legal-document";

const TITLE = "プライバシーポリシー";

const TIP = "読んでおいてね";

const SECTIONS = [
  {
    heading: "集める情報",
    paragraphs: [
      "ログインのときは Discord のユーザー ID と表示名だけを受け取ります。メールアドレスは受け取りません。",
      "サーバー管理者が同意したサーバーでは、選ばれたチャンネルとそのスレッドについて、メッセージ本文、投稿者の ID と表示名、添付ファイルの名前と URL、投稿日時を読み取ります。権限の計算のため、チャンネル名とロールの権限設定も保存します。",
      "Bot をサーバーに入れただけでは、メッセージを読み取りません。",
    ],
  },
  {
    heading: "使い道",
    paragraphs: [
      "集めた情報は、サーバーのメンバーが MCP に対応した AI クライアントから過去の会話を検索するためだけに使います。検索できるのは、その人が Discord で読めるチャンネルに限ります。",
      "広告や AI モデルの学習には使いません。第三者に販売や提供もしません。",
    ],
  },
  {
    heading: "保存のしかた",
    paragraphs: [
      "データは Cloudflare に保存し、処理も Cloudflare の上で行います。検索用の数値データは Cloudflare Workers AI で作ります。",
      "メッセージ本文と投稿者名はサーバーごとの鍵で暗号化します。検索用の数値データには本文を含めません。本文と検索の言葉はログに残しません。運営が本文を閲覧する機能はありません。",
    ],
  },
  {
    heading: "削除",
    paragraphs: [
      "サーバー管理者が同意を取り消すか Bot をサーバーから外すと、そのサーバーのメッセージと検索用データを削除します。対象から外したチャンネルのデータも削除します。",
      "最近のメッセージが Discord で削除されたときは、次の取り込みのときに mirucord からも削除します。",
    ],
  },
] as const;

const PrivacyPage = (): ReactNode => <LegalDocument title={TITLE} tip={TIP} sections={SECTIONS} />;

export { PrivacyPage };
