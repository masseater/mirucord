# mirucord ロードマップ

mirucord は、Discord のサーバーを読むだけの MCP サーバーをホスティングで提供するサービスである。
Bot をサーバーに招待すると、メッセージが事前に保存されて embedding され、MCP クライアントから自然言語で検索できる。
コードと IaC はすべて公開し、運営を信用しない人は自前で動かせるようにする。

## 守る方針

- 提供するのは読み取りだけで、Discord への書き込み手段は作らない。
- メッセージ本文と投稿者名は、ギルドごとのデータ鍵で AES-GCM により暗号化して D1 に保存する。データ鍵は `MASTER_KEY` から HKDF で導いた鍵で AES-KW により包む。
- Vectorize に置くのはベクトルと `guildId`・`channelId` だけで、本文は置かない。
- 検索結果は、MCP を使う人が Discord 上で閲覧できるチャンネルに限る。ロールとチャンネルの権限上書きから `ViewChannel` と `ReadMessageHistory` を計算して絞る。
- メッセージ本文と検索クエリを、ログ・span の属性・エラーメッセージに出さない。
- Bot がサーバーから外れたら、そのサーバーの行とベクトルを消す。
- デプロイは main の CI からだけ行う。

## 決めたこと

| 項目 | 決定 |
| --- | --- |
| 公開 URL | `https://mirucord.masseater.dev`（`src/shared/config/site.ts`） |
| MCP の endpoint | `https://mirucord.masseater.dev/mcp` |
| MCP の認可 | better-auth の `@better-auth/mcp`（OAuth 2.1 と DCR） |
| ログイン | Discord の OAuth で、scope は `identify` だけ。メールアドレスは集めない |
| embedding | Workers AI の `@cf/baai/bge-m3`（1024 次元、cosine） |
| 取り込み | Gateway は使わず、5 分ごとの Cron と Queue で REST をポーリングする |
| Cloudflare アカウント | `personal` |

## 今の状態

ブランチ `wip/foundation` に土台がある。

- `apps/web/alchemy.run.ts`: D1・Vectorize（metadata index 付き）・Queue と consumer・Workers AI・Cron・カスタムドメインを定義した。
- `src/shared/db`: `guild`・`role`・`channel`・`message` のテーブルを定義した。マイグレーションはまだ生成していない。
- `src/shared/crypto`: 鍵の包み直しと、メッセージの暗号化・復号を書いた。
- `src/shared/discord`: Discord REST の呼び出しと、閲覧権限の計算を書いた。
- `src/shared/ai`: bge-m3 で embedding を作る関数を書いた。
- `src/shared/auth`: better-auth に `jwt()` と `mcp()` を足し、テーブルを生成し直した。
- `patches/@better-auth__oauth-provider@1.7.7.patch`: `exactOptionalPropertyTypes` の下で `mcp()` が `BetterAuthPlugin` に代入できない型定義を直した。

`vp check` は lint エラーが 72 件残っていて通らない。`wip/foundation` の commit は hook を通していない。

## 残りのスライス

各スライスは `vp run verify` が通った状態で main に入れる。

1. 土台の lint を通す。`vp check` の指摘を、設定を緩めずに直す。
2. 取り込み。`src/features/ingest` に、Cron でギルド・ロール・チャンネルを同期して Queue に積む処理と、Queue でメッセージを取り込む処理を書く。取り込みでは、最新 100 件で編集と削除を突き合わせ、前回との隙間を埋め、過去分を遡る。`src/app/server/worker.ts` で TanStack Start の `fetch` と `scheduled`・`queue` をまとめて export する。最後に `vp run db:generate` で最初のマイグレーションを作る。
3. MCP。`/mcp` を `requireMcpAuth` と `@modelcontextprotocol/server` の `createMcpHandler` で実装する。ツールは `list_servers`・`list_channels`・`search_messages`・`read_messages` の 4 つにする。`/.well-known/*` を `auth.handler` に通すルートも作る。
4. 画面。`/` には、サインイン・MCP の URL・Bot の招待 URL（権限値 `66560`）を出す。`/sign-in` は Discord でサインインする画面、`/consent` は OAuth の同意画面にする。
5. デプロイと CI。`verify.yml` に `needs: verify` のデプロイジョブを足し、`alchemy deploy` を動かす。Worker のバージョンにコミットの SHA を刻む。
6. 運営の閲覧を管理者の承認制にする。サーバー管理者が期限付きで許可した時だけ、運営がサポート用の endpoint で読めるようにし、その記録を管理者に見せる。
7. 公式版の鍵を外部 KMS に移す。`MASTER_KEY` を使う今の方式は、自前運用の既定として残す。

## 引き継ぎの注意

- `auth:generate` は `mcp()` の起動処理が D1 を読むので、そのままでは失敗する。生成し直す時は、D1 を差し替えた一時設定を使う。
- `better-call` は zod 3 と zod 4 の 2 種類に解決されやすい。`apps/web` に `zod@4.6.5` を入れて 1 つにそろえている。
- secret は `DISCORD_BOT_TOKEN`・`DISCORD_CLIENT_SECRET`・`CLOUDFLARE_API_TOKEN`・`OPENROUTER_API_KEY` を使う。GitHub には `CLOUDFLARE_API_TOKEN`・`CLOUDFLARE_ACCOUNT_ID`・`OPENROUTER_API_KEY`・`CLAUDE_CODE_OAUTH_TOKEN` の secret と、`DISCORD_CLIENT_ID` の variable を入れてある。
- クラウドのセッションには `MIRUCORD_CLOUDFLARE_API_TOKEN`・`MIRUCORD_CLOUDFLARE_ACCOUNT_ID`・`DISCORD_CLIENT_ID` を渡してある。`apps/web/.env` では、前の 2 つを `CLOUDFLARE_API_TOKEN`・`CLOUDFLARE_ACCOUNT_ID` の名前で書く。
- `DISCORD_BOT_TOKEN` と `DISCORD_CLIENT_SECRET` は、GitHub の secret・クラウド環境・Mac の `~/.config/fish/secrets.fish` に入れてある。
- Alchemy の state store Worker は、実行の記録を Alchemy の集計先へ送る。この送信はオフにできない。
