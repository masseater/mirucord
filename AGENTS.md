作業を始める前に `repo-conventions` と `vite-plus` の skill を読み、従う。どちらも masseater/skills にあり、`vp install` が `.agents/skills/` に入れる。

## このリポジトリ

mirucord は、Discord のサーバーを読むだけの MCP サーバーをホスティングで提供するサービスである。本番は `https://mirucord.masseater.dev` で動いている。
これからやることと未決の検討事項は docs/roadmap.md に書く。画面と文言は DESIGN.md に従う。

## 運用の段階

本運用も本リリースもしていない（2026-10-12 時点）。データベースの破壊やアーキテクチャの再構築は好きなだけやってよい。

## 進め方

ユーザーへの報告は、結果と、ユーザーにしかできない操作が要るときだけにする。
ユーザーに手元での作業を頼まない。クラウドのセッションだけで終わらせる。
文言やデザインの指摘を1件受けたら、同じ基準でアプリの全画面を見直す。

## 構成とデータの流れ

- `apps/gateway` は Fly.io で動く dfx の Discord Gateway 接続で、受けたイベントをジョブにして Web の `/api/gateway` へ署名付きで POST する。ジョブの型・署名・パスは `libs/ingest/util-gateway-contract` が両者で共有する。
- `apps/web` は 1 つの Worker が画面（TanStack Start）・`/api`・`/mcp`・Queue の consumer をまとめて持つ。入口は `src/app/server/index.ts` である。
- 取り込みは `features/ingest` が担い、追いつき・撤退・移行のような長い仕事は Queue `INGEST` に積む。メッセージは鯖ごとの Durable Object `GuildStore`（SQLite）に入り、検索用のファイルとベクトルは R2 `SEARCH` に書き出される。MCP のツールは `features/mcp` にある。
- スキーマは 2 系統ある。D1 は `drizzle.config.ts`（`*.table.ts`、出力は `drizzle/`）、`GuildStore` は `drizzle.guild.config.ts`（`entities/guild-message/model/*.schema.ts`、出力は `drizzle-guild/`）で、`vp run db:generate` が両方を生成する。
- `apps/web/alchemy.run.ts` が本番の Worker、`apps/web/alchemy.ci.ts` が CI のトークンと GitHub の Secrets を持つ `mirucord-ci` スタックである。main の CI は web と gateway の両方をデプロイする。

## コマンド

- `vp run verify` はルートの `vite.config.ts` のタスクで、`vp check` に加えてテスト・vpa（betterleaks・commitlint・actionlint・zizmor・steiger・textlint）・yomiyasu・drizzle の差分検査・fallow・audit などを流す。検査の設定は `checks.config.ts` にある。
- 1 つのテストだけを流すときは、そのワークスペースで `vp exec vp test run <ファイル>` を実行する。`apps/web` のテストは `@cloudflare/vitest-plugin` の上で D1・R2・Queue・Durable Object をそろえて動く。

## 想定規模と性能要件

設計・負荷試算・費用試算は、今の規模ではなく次の規模を前提にする。

| 項目 | 前提 |
| --- | --- |
| サーバー数 | 500 鯖 |
| 1 鯖の人数 | 平均 200 人、最大 1,000 人 |
| 日常的に使う人 | 各鯖の参加者の半数 |

| 項目 | 要件 |
| --- | --- |
| 1 鯖の同時リクエスト | 1,000 件 |
| 全体のリクエスト | 毎秒 1,000 件 |
| 取り込むメッセージ | 1 鯖 1 日 2,000 件 |
| 応答時間 | 上の負荷を並列にさばき、各リクエストは Worker が受けてから 3 分以内に返す。その範囲で、応答時間も費用も小さいほどよい。MCP の tasks 拡張は前提にしない |

- 試算に使う鯖の人数・投稿数・リクエスト数・DO の行数や容量や実時間は、Cloudflare の GraphQL Analytics API と Discord API で本番の値を取り、取った値と日付を試算に書く。
- 「作業配信」はサーバー名であり、配信者の鯖ではない。

## Cloudflare

- Paid に含まれる D1・Queues・Workers AI・Durable Objects などの無料枠は使ってよい。Free プランの上限は持ち出さない。

## 文書

docs/ に新しいファイルを増やさない。既存のファイルを更新し、終わった計画や経緯は消す。
リポジトリで管理するスキルは .claude/skills/ に置く。

## 配置

ドメイン、リポジトリ名、鍵の導出に使う文字列は定数に寄せない。

## Alchemy

`APP_NAME` は `SERVICE_NAME` と別に持つ。
`APP_NAME` やスタック名を変えると、Random の値も含めてリソースは作り直される。スタック名を変えるときは、先に state を新しいスタック名へ写す。

## その他

部品だけを先に入れず、使う側と同じ PR にする。

クラウドのセッションでは、`~/.config/uv/uv.toml` に `system-certs = true` を書いてから verify する。
`mirucord-ci` スタックの適用など、GitHub Actions の Secrets API と Cloudflare の Global API Key が要る作業は、ユーザーの Mac の Remote Control で行う。

## テンプレート

フック・lint・CI など足場を変えたら、masseater/typescript-template にも同じ変更を入れ、release-please でリリースを出す。
