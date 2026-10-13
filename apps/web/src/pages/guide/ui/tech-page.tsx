import type { ReactNode } from "react";

import type { GuideSection } from "#/pages/guide/model/guide-block";
import { MASCOT_NAME, SERVICE_NAME } from "#/shared/config";

import { GuideDocument } from "./guide-document";

const TITLE = "技術の話";
const TIP = `${MASCOT_NAME}の中身を見せちゃうよ`;
const LEAD = `${SERVICE_NAME} の構成、データの流れ、権限と同意の設計、検索の仕組みをまとめました。Cloudflare Workers と MCP をなんとなく知っている人に向けて書いています。`;

const SECTIONS: readonly GuideSection[] = [
  {
    heading: `${MASCOT_NAME}がさがしているもの`,
    blocks: [
      {
        type: "text",
        text: `サイトでは「${MASCOT_NAME}が Discord をさがしに行く」と紹介していますが、検索のたびに Discord を読みに行っているわけではありません。同意済みのサーバーのメッセージを、あらかじめ ${SERVICE_NAME} のデータベースに取り込んでおき、検索ではその写しの中をさがしています。`,
      },
      {
        type: "text",
        text: "そのため、検索できるのは取り込みが済んだメッセージだけです。新しい投稿、編集、削除は Gateway でほぼすぐに写しへ反映し、Gateway がつなぎ直したときに取りこぼしを拾います。",
      },
    ],
  },
  {
    heading: "全体の構成",
    blocks: [
      {
        type: "text",
        text: `${SERVICE_NAME} は、Cloudflare Workers で動く 1 つの Worker と、Discord の Gateway につなぎっぱなしにする fly.io の Machine 1 台でできています。Web 画面、MCP サーバー、取り込みの処理は、すべて同じ Worker が受け持ちます。`,
      },
      {
        type: "flow",
        edges: [
          { from: "AI クライアント", label: "MCP と OAuth 2.1", to: "Worker の /mcp" },
          { from: "Discord の Gateway", label: "WebSocket", to: "fly.io の Gateway" },
          { from: "fly.io の Gateway", label: "署名付きの POST", to: "Worker の /api/gateway" },
          { from: "Worker", label: "REST で読む", to: "Discord の API" },
          { from: "Worker", label: "取り込みのジョブ", to: "Queues" },
          { from: "Worker", label: "サーバーと同意の情報", to: "D1" },
          {
            from: "Worker",
            label: "暗号化したメッセージ",
            to: "サーバーごとの Durable Object",
          },
          { from: "Durable Object", label: "検索用の索引と暗号文の写し", to: "R2" },
          { from: "Worker", label: "画像の説明を作る", to: "Workers AI" },
          { from: "Durable Object", label: "意味で探すためのベクトルを作る", to: "Workers AI" },
          { from: "Worker", label: "マスター鍵を読む", to: "Secrets Store" },
        ],
      },
      {
        type: "table",
        head: ["役割", "使っているもの"],
        rows: [
          ["Web と API", "Cloudflare Workers の上の TanStack Start と Elysia"],
          ["データベース", "APAC に置いた Cloudflare D1 と Drizzle ORM"],
          ["メッセージ", "サーバーごとに 1 つ置く Durable Object の SQLite"],
          ["検索用の索引", "北米東部に置いた Cloudflare R2 と Cache API"],
          ["画像の説明", "Workers AI の `@cf/google/gemma-4-26b-a4b-it`"],
          ["意味で探すためのベクトル", "Workers AI の `@cf/baai/bge-m3` と ml-kmeans"],
          ["意味で探した結果の並べ替え", "Workers AI の `@cf/baai/bge-reranker-base`"],
          ["取り込みの待ち行列", "Cloudflare Queues"],
          ["鍵の保管", "Cloudflare Secrets Store"],
          ["Gateway の常駐", "fly.io の shared-cpu-1x、256MB の Machine 1 台"],
          [
            "認証",
            "Discord の OAuth と、MCP 用の OAuth 2.1 と動的クライアント登録を扱う better-auth",
          ],
          ["Discord の API", "`dfx`"],
          [
            "インフラの定義",
            "`apps/web/alchemy.run.ts` と `apps/gateway/alchemy.run.ts` の Alchemy",
          ],
        ],
      },
    ],
  },
  {
    heading: "データの流れ",
    blocks: [
      {
        type: "steps",
        items: [
          "サーバーの管理者が Bot を招待し、管理画面でサーバー単位に同意します。同意するまでは 1 件も読みません。",
          "Bot の参加と退出、チャンネル・スレッド・ロールの変更は Gateway で受け、そのサーバーのチャンネルと権限の一覧をすぐに同期します。同意したときと、過去の履歴が残っているあいだは、取り込みのジョブを Queue に積みます。",
          "Queue のコンシューマーが Discord の REST からメッセージを 1 ページずつ読み、本文と投稿者名を暗号化して、サーバーごとの Durable Object に保存します。あわせて検索用の索引の材料を作って同じ行に入れます。",
          "新しいメッセージ、編集、削除は fly.io の Gateway が受けます。Gateway はメッセージの本文・投稿者・添付を署名付きで Worker に送り、Worker はそれを暗号化して保存するか、行を消します。編集や削除は、その場で検索結果から外れます。",
          "Gateway が resume で再開できずに新しいセッションでつなぎ直したときは、参加サーバーの一覧を確かめ直し、全サーバーのチャンネルを同期して、切れていた間の新しいメッセージを取り込みます。",
        ],
      },
      {
        type: "text",
        text: "Gateway からの通知は Standard Webhooks の形式で、Bot トークンを鍵にして署名します。署名が合わない通知は捨てます。Workers は Gateway の WebSocket につなぎっぱなしにする常駐プロセスを置く場所ではないので、Gateway だけを fly.io に置いています。",
      },
    ],
  },
  {
    heading: "暗号化と保存",
    blocks: [
      {
        type: "list",
        items: [
          "マスター鍵は Secrets Store の `MIRUCORD_MASTER_KEY` にあり、デプロイのときに Alchemy が乱数で作ります。",
          "サーバーごとに 256 ビットのデータ鍵を作ります。データ鍵は、マスター鍵から HKDF で導いた鍵を使って AES-KW で包み、D1 に保存します。",
          "メッセージ本文と転送元の本文、投稿者名、添付ファイルの名前と URL、埋め込み、スタンプの名前、投票の質問と選択肢は、データ鍵で AES-256-GCM の JWE にして保存します。暗号文にはサーバー、チャンネル、メッセージの ID を結びつけてあり、別の行に貼り替えると開けません。",
          "検索用の索引には、本文を 1〜3 文字ずつに区切り、データ鍵から導いた HMAC 鍵でハッシュにした値だけを置きます。本文そのものは置きません。",
          "メッセージ本文と検索の言葉は、ログ、トレース、エラーメッセージに出しません。",
          "運営が本文を見る機能はありません。",
        ],
      },
    ],
  },
  {
    heading: "権限と同意",
    blocks: [
      {
        type: "list",
        items: [
          "ログインは Discord の OAuth で、scope は `identify` だけです。メールアドレスは受け取りません。",
          "Bot が求める権限は「チャンネルを見る」「メッセージ履歴を読む」「メッセージを送信」「監査ログを表示」の 4 つです。Bot がサーバーに参加したとき、監査ログから招待した人を調べ、その人に使い方の案内を DM で 1 回送ります。DM を送れないときはチャンネルに投稿します。送信はこの案内と、同意したときにサーバーへお知らせを 1 回投稿するためだけに使います。",
          "取り込みに同意できるのは、サーバーの管理権限か管理者権限を持つ人です。",
          "取り込む範囲は、Bot が Discord で見られるチャンネルそのものです。Bot から見えなくなったチャンネルは取り込みを止め、30 日後に消します。",
          "Bot がサーバーから外れたら、そのサーバーの行と索引を消します。",
          "ログインした人は管理画面から、サーバーごとに、保存された自分の投稿を消せます。消したあとは、そのサーバーでのその人の投稿を取り込みません。",
        ],
      },
      {
        type: "text",
        text: "検索や閲覧のたびに、Bot を通じて利用者のロールを Discord から取り直し、カテゴリとチャンネルの権限の上書きを Discord の公式ドキュメントと同じ順序で解決します。結果は、その人が Discord で読めるチャンネルだけに絞ります。範囲外のサーバーやチャンネルは、存在しない場合と同じ応答を返します。",
      },
    ],
  },
  {
    heading: "検索の仕組み",
    blocks: [
      {
        type: "table",
        head: ["MCP のツール", "できること"],
        rows: [
          ["`list_servers`", "使えるサーバーの一覧"],
          ["`list_channels`", "読めるチャンネル、スレッド、フォーラムの投稿の一覧"],
          ["`find_messages`", "言葉をそのまま含むメッセージを探し、件数も数える"],
          ["`find_similar_messages`", "言葉が違っても意味の近いメッセージを、近い順に探す"],
          ["`read_messages`", "チャンネルの最新のメッセージを新しい順に読む"],
        ],
      },
      {
        type: "steps",
        items: [
          "`find_messages` では、検索の言葉を索引と同じ方法で区切ってハッシュにします。",
          "R2 から、そのサーバーの索引を期間ごとに読み、ハッシュをすべて含むメッセージを新しい順に選び、読めるチャンネルのものだけに絞ります。",
          "選んだメッセージの暗号文を R2 からまとめて読みます。一度読んだ索引と暗号文は Cache API に置き、同じ拠点での次の検索では読み直しません。",
          "見つかった行をデータ鍵で復号し、大文字と小文字を区別せずに言葉をそのまま含むかを確かめてから返します。",
        ],
      },
      {
        type: "text",
        text: "ハッシュの索引なので、運営も索引から本文を読めません。照合は文字どおりなので、言い回しが違うメッセージは見つかりません。画像は、Workers AI が付けた説明文も検索の対象にします。",
      },
      {
        type: "steps",
        items: [
          "`find_similar_messages` のために、Durable Object が各メッセージを Workers AI の bge-m3 で 1,024 次元のベクトルにし、int8 に縮めてデータ鍵で暗号化します。",
          "ベクトルは索引と同じ期間ごとに R2 に置きます。件数の多い期間は k-means で近いもの同士の塊に分けます。全期間の塊の中心は、鯖ごとに 1 つのファイルにまとめます。",
          "検索では検索の言葉をベクトルにし、鯖全体で中心が近い塊を 5% ほど選んで読み、距離を計算して、近い 50 件の本文を R2 から読みます。その 50 件を bge-reranker-base で検索の言葉と 1 件ずつ照らし合わせ、関係の深い順に返します。同じ検索の言葉のベクトルは Cache API に置き、作り直しません。",
          "Workers AI は 1 日の無料枠の中で使います。その日に使った量を数え、過去のメッセージのベクトル作りは枠が近づいたら翌日（UTC 0 時）に回します。",
        ],
      },
      {
        type: "text",
        text: "ツールの結果は `structuredContent` と `outputSchema` で返し、取り込みが終わっていないチャンネルは `notFullyIngested` で知らせます。",
      },
      {
        type: "text",
        text: "MCP のエンドポイントは `/mcp` です。認可は OAuth 2.1 で、動的クライアント登録に対応しているので、AI クライアントに URL を入れるだけで登録が済みます。",
      },
    ],
  },
];

const TechPage = (): ReactNode => (
  <GuideDocument title={TITLE} tip={TIP} lead={LEAD} sections={SECTIONS} />
);

export { TechPage };
