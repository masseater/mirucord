import type { ReactNode } from "react";

import { PRIVACY_PATH } from "#/shared/config";
import { Panel } from "#/shared/ui/panel";

const TITLE = "mirucord が読み取るもの";
const POLICY = "プライバシーポリシー";

const ITEMS = [
  {
    term: "読むもの",
    detail:
      "選んだチャンネルとそのスレッドのメッセージ本文、投稿者の ID と表示名、添付ファイルの名前と URL、投稿日時です。",
  },
  {
    term: "読む範囲",
    detail:
      "選んだチャンネルの過去ログを Bot が読める限りさかのぼり、そのあとの新しいメッセージも 5 分ごとに読み取ります。選ばなかったチャンネルは読みません。",
  },
  {
    term: "目的",
    detail:
      "サーバーのメンバーが AI から過去の会話を検索できるようにするためです。検索できるのは、その人が Discord で読めるチャンネルだけです。",
  },
  {
    term: "保存のしかた",
    detail:
      "本文と投稿者名はサーバーごとの鍵で暗号化して保存します。検索用の数値データには本文を含めません。運営が本文を閲覧する機能はありません。",
  },
  {
    term: "やめるとき",
    detail:
      "いつでも同意を取り消せます。取り消すと読み取りを止め、保存したメッセージと検索用データを削除します。Bot をサーバーから外したときも削除します。",
  },
] as const;

const ConsentExplainer = (): ReactNode => (
  <Panel>
    <h2 className="text-xl font-black">{TITLE}</h2>
    <dl className="grid gap-3 leading-relaxed md:grid-cols-4">
      {ITEMS.map((item) => [
        <dt key={`${item.term}-term`} className="text-blurple font-black md:col-span-1">
          {item.term}
        </dt>,
        <dd key={`${item.term}-detail`} className="text-ink-soft md:col-span-3">
          {item.detail}
        </dd>,
      ])}
    </dl>
    <a href={PRIVACY_PATH} className="hover:text-blurple self-start font-bold underline">
      {POLICY}
    </a>
  </Panel>
);

export { ConsentExplainer };
