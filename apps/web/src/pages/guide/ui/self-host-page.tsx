import type { ReactNode } from "react";

import type { GuideSection } from "#/pages/guide/model/guide-block";
import { FREE_GUILD_LIMIT, MASCOT_NAME, REPOSITORY_URL, SERVICE_NAME } from "#/shared/config";

import { GuideDocument } from "./guide-document";

const TITLE = "セルフホスト";
const TIP = `自分のおうちでも${MASCOT_NAME}は働けるよ`;
const LEAD = `${SERVICE_NAME} はコードとインフラの定義をすべて公開しています。運営を信用しなくても、自分の Cloudflare アカウントで同じものを動かせます。このページでは、ホスト名を例として \`${SERVICE_NAME}.example.com\` にしています。`;

const SECTIONS: readonly GuideSection[] = [
  {
    heading: "用意するもの",
    blocks: [
      {
        type: "list",
        items: [
          "Cloudflare のアカウントと、そこで管理しているドメインを用意します。Workers、D1、Durable Objects、Queues、Workers AI、Secrets Store を使い、Workers Paid プランを前提にしています。無料プランでは、D1 の 1 日あたりの書き込みや Worker の CPU 時間の上限で取り込みが止まります。",
          "Discord Developer Portal でアプリケーションを作ります。手順は次の節にあります。",
          "fly.io のアカウントも必須です。Discord の Gateway につなぎっぱなしにするプロセスをここに置きます。メッセージの取り込みも、サーバーやチャンネルの変化の反映も、この Gateway から始まります。",
          "CI からデプロイするなら、GitHub のアカウントも使います。",
          "手元には Node.js と Vite+ の `vp` コマンドを入れておきます。",
        ],
      },
    ],
  },
  {
    heading: "Discord のアプリを作る",
    blocks: [
      {
        type: "steps",
        items: [
          "Discord Developer Portal で New Application からアプリを作ります。",
          `OAuth2 の Redirects に \`https://${SERVICE_NAME}.example.com/api/auth/callback/discord\` を足します。`,
          "OAuth2 の Client ID と Client Secret を控えます。それぞれ `DISCORD_CLIENT_ID` と `DISCORD_CLIENT_SECRET` になります。",
          "Bot の Reset Token でトークンを発行して控えます。これが `DISCORD_BOT_TOKEN` になります。",
          "Bot の Privileged Gateway Intents で Message Content Intent を有効にします。メッセージ本文を読むのに要ります。",
        ],
      },
    ],
  },
  {
    heading: "コードを自分用に直す",
    blocks: [
      {
        type: "code",
        code: `git clone ${REPOSITORY_URL}.git\ncd ${SERVICE_NAME}\nvp install`,
      },
      {
        type: "table",
        head: ["ファイル", "直すところ"],
        rows: [
          [
            "`apps/web/src/shared/config/site.ts`",
            "`SITE_HOST` を自分のホスト名にします。サイトの URL と MCP の URL はここから決まります。",
          ],
          [
            "`apps/gateway/src/app/deliver.ts`",
            "`GATEWAY_ENDPOINT` のホスト名を自分のホスト名にします。Gateway はここへイベントを送ります。",
          ],
          [
            "`apps/gateway/src/app/service.ts`",
            "fly.io のアプリ名を表す `name` を自分用の名前にします。fly.io のアプリ名は全体で一意なので、そのままでは作れません。",
          ],
          [
            "`apps/web/alchemy.ci.ts`",
            "`repo` を自分の GitHub のリポジトリにします。CI からデプロイするときだけ要ります。",
          ],
          [
            "`.github/workflows/verify.yml`",
            "`deploy` ジョブの条件にある `github.repository` を自分のリポジトリにします。CI からデプロイするときだけ要ります。",
          ],
        ],
      },
    ],
  },
  {
    heading: "環境変数とシークレット",
    blocks: [
      {
        type: "table",
        head: ["名前", "要るか", "使いどころ"],
        rows: [
          ["`CLOUDFLARE_ACCOUNT_ID`", "必須", "デプロイ先の Cloudflare アカウント"],
          ["`CLOUDFLARE_API_TOKEN`", "必須", "Cloudflare の認証"],
          ["`DISCORD_CLIENT_ID`", "必須", "ログインと Bot の招待"],
          ["`DISCORD_CLIENT_SECRET`", "必須", "ログイン"],
          ["`DISCORD_BOT_TOKEN`", "必須", "取り込み、Gateway、Gateway の通知の署名"],
          ["`FLY_API_TOKEN`", "必須", "fly.io の認証"],
          ["`MAX_GUILDS`", "任意", `Bot が入れるサーバーの数の上限で、既定は ${FREE_GUILD_LIMIT}`],
          ["`ALERT_WEBHOOK_URL`", "任意", "障害を知らせる Discord の Webhook"],
          ["`ALCHEMY_STAGE`", "任意", "Alchemy のステージ名"],
        ],
      },
      {
        type: "text",
        text: "ログインの署名鍵 `BETTER_AUTH_SECRET` と、メッセージを包むマスター鍵 `MIRUCORD_MASTER_KEY` は自分で用意しません。初めてのデプロイで Alchemy が乱数で作ります。",
      },
    ],
  },
  {
    heading: "手元からデプロイする",
    blocks: [
      {
        type: "text",
        text: "`apps/web/.env.example` を `apps/web/.env` にコピーし、上の表の値を書きます。Alchemy は `.env` を自動で読みます。",
      },
      {
        type: "code",
        code: "cd apps/web\ncp .env.example .env\nvp exec alchemy deploy --stage prod\ncd ../gateway\ncp ../web/.env .env\nvp exec alchemy deploy --stage prod",
      },
      {
        type: "text",
        text: "`apps/web` の deploy で Worker、D1、Durable Objects、Queues、Secrets Store がそろい、D1 のマイグレーションも適用されます。`apps/gateway` の deploy は fly.io に Gateway を置きます。ステージを `prod` 以外にすると、リソース名の末尾に `-<ステージ名>` が付きます。",
      },
    ],
  },
  {
    heading: "CI からデプロイする",
    blocks: [
      {
        type: "text",
        text: "`.github/workflows/verify.yml` は、main への push で検査が通ると `deploy` ジョブで同じ 2 つのデプロイを行います。`FLY_API_TOKEN` がなければ Gateway はデプロイしません。",
      },
      {
        type: "table",
        head: ["GitHub の設定", "名前"],
        rows: [
          [
            "Actions secrets",
            "`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`DISCORD_CLIENT_SECRET`、`DISCORD_BOT_TOKEN`、`FLY_API_TOKEN`、`ALERT_WEBHOOK_URL`、`OPENROUTER_API_KEY`",
          ],
          ["Actions variables", "`DISCORD_CLIENT_ID`、`MAX_GUILDS`"],
        ],
      },
      {
        type: "text",
        text: `\`OPENROUTER_API_KEY\` は検査の jev-lint が使います。\`apps/web/alchemy.ci.ts\` を手元からデプロイすると、デプロイに要る権限だけを持つ \`${SERVICE_NAME}-deploy\` という Cloudflare の API トークンを作り、上の値を GitHub に登録します。このときだけは、API トークンを作る権限のある Cloudflare の認証と \`GITHUB_TOKEN\` が要ります。`,
      },
      {
        type: "code",
        code: "cd apps/web\nvp exec alchemy deploy alchemy.ci.ts --stage prod",
      },
    ],
  },
  {
    heading: "使いはじめる",
    blocks: [
      {
        type: "steps",
        items: [
          `\`https://${SERVICE_NAME}.example.com\` を開き、招待ボタンから Bot をサーバーに入れます。`,
          `\`https://${SERVICE_NAME}.example.com/dashboard\` にログインし、サーバーの取り込みに同意します。`,
          `AI クライアントに \`https://${SERVICE_NAME}.example.com/mcp\` を MCP のコネクタとして登録します。Claude なら、設定のコネクタからカスタムコネクタを追加して URL を入れます。動的クライアント登録に対応しているので、Client ID は要りません。`,
          "初めて使うときに Discord でログインし、同意の画面で許可します。",
        ],
      },
      {
        type: "text",
        text: `動いているかは \`https://${SERVICE_NAME}.example.com/api/health\` で確かめられます。デプロイしたバージョンと日時を返します。`,
      },
    ],
  },
];

const SelfHostPage = (): ReactNode => (
  <GuideDocument title={TITLE} tip={TIP} lead={LEAD} sections={SECTIONS} />
);

export { SelfHostPage };
