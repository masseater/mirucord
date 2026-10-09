# mirucord ロードマップ

mirucord は、Discord のサーバーを読むだけの MCP サーバーをホスティングで提供するサービスである。
Bot をサーバーに招待すると、メッセージが事前に保存されて embedding され、MCP クライアントから自然言語で検索できる。
コードと IaC はすべて公開し、運営を信用しない人は自前で動かせるようにする。

## 守る方針

提供するのは読み取りだけで、Discord への書き込み手段は作らない。
デプロイは main の CI からだけ行う。

メッセージ本文と投稿者名は、ギルドごとのデータ鍵で AES-GCM により暗号化して D1 に保存する。
データ鍵は `MASTER_KEY` から HKDF で導いた鍵で AES-KW により包む。
Vectorize に置くのはベクトルと `guildId`・`channelId` だけで、本文は置かない。
メッセージ本文と検索クエリを、ログ・span の属性・エラーメッセージに出さない。
Bot がサーバーから外れたら、そのサーバーの行とベクトルを消す。

検索結果は、MCP を使う人が Discord 上で閲覧できるチャンネルに限る。
ロールとチャンネルの権限上書きから `ViewChannel` と `ReadMessageHistory` を計算して絞る。

## 決めたこと

| 項目                  | 決定                                                                    |
| --------------------- | ----------------------------------------------------------------------- |
| 公開 URL              | `https://mirucord.masseater.dev`（`src/shared/config/site.ts`）         |
| MCP の endpoint       | `https://mirucord.masseater.dev/mcp`                                    |
| MCP の認可            | better-auth の `@better-auth/mcp`（OAuth 2.1 と DCR）                   |
| ログイン              | Discord の OAuth で、scope は `identify` だけ。メールアドレスは集めない |
| embedding             | Workers AI の `@cf/baai/bge-m3`（1024 次元、cosine）                    |
| 取り込み              | Gateway は使わず、5 分ごとの Cron と Queue で REST をポーリングする     |
| Cloudflare アカウント | `personal`                                                              |

## 今の状態

スライス 1 から 3 までを書いた。

| 場所                                   | 内容                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `apps/web/alchemy.run.ts`              | D1・Vectorize（metadata index 付き）・Queue と consumer・Workers AI・Cron・カスタムドメイン |
| `apps/web/drizzle`                     | 最初のマイグレーション                                                                      |
| `src/app/server/index.ts`              | TanStack Start の `fetch` と、`scheduled`・`queue` をまとめた Worker のエントリ             |
| `src/features/ingest`                  | Cron での同期と、Queue でのメッセージ取り込み                                               |
| `src/features/mcp`                     | 閲覧権限の計算、4 つのツール、`/mcp` の endpoint                                            |
| `src/shared/crypto`                    | 鍵の包み直しと、メッセージの暗号化・復号                                                    |
| `src/shared/discord`                   | Discord REST の呼び出し                                                                     |
| `patches/@better-auth__oauth-provider` | `exactOptionalPropertyTypes` の下で `mcp()` が `BetterAuthPlugin` に代入できない型の修正    |

`vp run verify` は、クラウドで動かない jev-lint と actions-lint を除いて通る。
`vp build` は `cloudflare:workers` を解決できずに失敗する。スライス 5 で Alchemy のビルドに合わせて直す。

## 残りのスライス

各スライスは `vp run verify` が通った状態で main に入れる。

### 1. lint を通す（済）

`vp check` の指摘を、設定を緩めずに直した。

### 2. 取り込み（済）

`src/features/ingest` に、Cron でギルド・ロール・チャンネルを同期して Queue に積む処理を書いた。
同じ場所に、Queue でメッセージを取り込む処理も書いた。
取り込みでは、最新 100 件で編集と削除を突き合わせ、前回との隙間を埋め、過去分を遡る。

### 3. MCP（済）

`/mcp` を `requireMcpAuth` と `@modelcontextprotocol/server` の `createMcpHandler` で実装する。
ツールは `list_servers`・`list_channels`・`search_messages`・`read_messages` の 4 つにする。
`/.well-known/*` を `auth.handler` に通すルートも作る。

どのツールも、呼ばれるたびに閲覧範囲を決め直す。
まず、アクセストークンの `sub` から、better-auth の `account` テーブルで Discord のユーザー ID を引く。
次に、`findMember` でそのサーバーの参加者かどうかを Discord に問い合わせる。
参加者でなければ、そのサーバーは存在しないものとして扱う。
参加者なら、メンバーのロールと D1 のロール・チャンネルの権限上書きから、`canReadHistory` で見られるチャンネルを決める。

スレッドは親チャンネルの権限で判定し、非公開スレッドは対象にしない。
`search_messages` では、Vectorize の filter で見られるチャンネルに絞る。
さらに、D1 から行を読んだあとにもチャンネルを照合し、範囲外の行を捨てる。
範囲外のサーバーやチャンネルを指定されたら、存在しない場合と同じ応答を返し、存在するかどうかを漏らさない。

権限計算と閲覧範囲の決定には、テストを書く。確かめる内容は次の表のとおりである。

| 状況                                                 | 期待する結果 |
| ---------------------------------------------------- | ------------ |
| 非参加者                                             | 何も見えない |
| `@everyone` で拒否され、ロールで許可されたチャンネル | 見える       |
| メンバー単位の拒否とロールの許可が重なったチャンネル | 見えない     |
| オーナーと管理者                                     | 全部見える   |
| 親チャンネルを見られないスレッド                     | 見えない     |

### 4. 画面

`/` には、サインイン・MCP の URL・Bot の招待 URL（権限値 `66560`）を出す。
`/sign-in` は Discord でサインインする画面、`/consent` は OAuth の同意画面にする。

### 5. デプロイと CI

`verify.yml` に `needs: verify` のデプロイジョブを足し、`alchemy deploy` を動かす。
Worker のバージョンにコミットの SHA を刻む。

### 6. 運営の閲覧を管理者の承認制にする

サーバー管理者が期限付きで許可した時だけ、運営がサポート用の endpoint で読めるようにする。
その記録を管理者に見せる。

### 7. 公式版の鍵を外部 KMS に移す

`MASTER_KEY` を使う今の方式は、自前運用の既定として残す。

## 引き継ぎの注意

`patches/@better-auth__oauth-provider` は、上流の issue #10213 の回避策である。
修正の PR #10266 が取り込まれたら、パッチを消す。

スライス 4 では、テンプレートから消した shadcn の `Button` と eden のクライアントを、使う時が来たら入れ直す。

`auth:generate` は `mcp()` の起動処理が D1 を読むので、そのままでは失敗する。
生成し直す時は、D1 を差し替えた一時設定を使う。

`better-call` は、steiger が持ち込む zod 3 のせいで、peer の解決が 2 種類に分かれる。
API エラーの判定は名前でも行われるので、2 つ読み込まれても動作は変わらない。
zod は禁止パッケージなので、そろえるために足してはいけない。

secret は `DISCORD_BOT_TOKEN`・`DISCORD_CLIENT_SECRET`・`CLOUDFLARE_API_TOKEN`・`OPENROUTER_API_KEY` を使う。
GitHub には `CLOUDFLARE_API_TOKEN`・`CLOUDFLARE_ACCOUNT_ID`・`OPENROUTER_API_KEY`・`CLAUDE_CODE_OAUTH_TOKEN` の secret を入れてある。
`DISCORD_CLIENT_ID` は GitHub の variable に入れてある。
`DISCORD_BOT_TOKEN` と `DISCORD_CLIENT_SECRET` は、GitHub の secret・クラウド環境・Mac の `~/.config/fish/secrets.fish` に入れてある。

クラウドのセッションには `MIRUCORD_CLOUDFLARE_API_TOKEN`・`MIRUCORD_CLOUDFLARE_ACCOUNT_ID`・`DISCORD_CLIENT_ID` を渡してある。
`apps/web/.env` では、前の 2 つを `CLOUDFLARE_API_TOKEN`・`CLOUDFLARE_ACCOUNT_ID` の名前で書く。
クラウドのセッションには `OPENROUTER_API_KEY` がないため、jev-lint は手元では動かない。

Alchemy の state store Worker は、実行の記録を Alchemy の集計先へ送る。この送信はオフにできない。
