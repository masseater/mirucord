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

スライス 1 から 7 までを書いた。

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
単体の `vp build` は `cloudflare:workers` を解決できずに失敗する。Cloudflare の Vite プラグインは `alchemy deploy` が差し込むので、ビルドはデプロイの中で行う。

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

### 4. 画面（済）

`/` には、MCP の URL と Bot の招待 URL（権限値 `66560`）を出す。サインインへは MCP クライアントの認可の流れで案内される。
`/sign-in` は Discord でサインインする画面、`/consent` は OAuth の同意画面にする。

### 5. デプロイと CI（済）

`verify.yml` の `deploy` ジョブが、main の verify が通った後に `alchemy deploy --stage prod` を動かす。
Worker のバージョンにはコミットの SHA を刻み、`/api/health` がそれを返す。

デプロイジョブは、リポジトリに次の設定があることを前提にする。

| 種類      | 名前                                                                                          |
| --------- | --------------------------------------------------------------------------------------------- |
| Secrets   | `CLOUDFLARE_API_TOKEN`・`CLOUDFLARE_ACCOUNT_ID`・`DISCORD_CLIENT_SECRET`・`DISCORD_BOT_TOKEN` |
| Secrets   | `OTEL_EXPORTER_OTLP_HEADERS`（任意）                                                          |
| Variables | `DISCORD_CLIENT_ID`・`OTEL_EXPORTER_OTLP_ENDPOINT`（任意）・`SUPPORT_OPERATOR_IDS`（任意）    |

### 6. 運営の閲覧を管理者の承認制にする（済）

運営は、`SUPPORT_OPERATOR_IDS` に Discord のユーザー ID を並べた人である。
サーバー管理者（オーナー、管理者権限、サーバー管理権限のいずれか）が `grant_support_access` で時間（1〜72 時間）を決めて許可した間だけ、運営は同じ `/mcp` から保存済みの全チャンネルを読める。
運営の読み出しはツールごとに `support_access` へ記録し、管理者は `list_support_access` で許可と読み出しの履歴を見られる。`revoke_support_access` で期限前に打ち切れる。
別の endpoint を立てず `/mcp` に寄せたのは、権限の判定と記録を 1 か所に保つためである。

### 7. 公式版の鍵を外部 KMS に移す（済）

`AWS_KMS_KEY_ID` などの AWS の設定がそろうと、新しいサーバーの鍵は AWS KMS で作る。
保存する値には `aws-kms:` を頭に付ける。
開くときは頭の印で方式を選ぶので、`MASTER_KEY` で包んだ既存の鍵もそのまま読める。
`MASTER_KEY` を使う方式は、自前運用の既定として残す。
AWS の呼び出しには、Alchemy と同じ作者の `@distilled.cloud/aws` を使う。Effect で書かれ、Workers 向けの export を持つためである。

デプロイジョブは Variables の `AWS_KMS_KEY_ID`・`AWS_REGION`・`AWS_ACCESS_KEY_ID` と、Secrets の `AWS_SECRET_ACCESS_KEY` を渡す。IAM ユーザーには、その鍵への `kms:GenerateDataKeyWithoutPlaintext` と `kms:Decrypt` だけを許す。

## 引き継ぎの注意

チャンネル権限の計算（`features/mcp/model/permissions.ts`）は手で書いた。
discord.js の `GuildChannel#permissionsFor` はログイン済みの Client のキャッシュを前提にしており、D1 に保存した REST の値からは使えない。
`@discordjs/rest` と `discord-api-types` は通信と型だけで、権限の計算は持たない。
npm でも、REST の値から権限を計算する保守されたパッケージは見つからなかった。
計算の順序は、Discord 公式ドキュメント「Permissions」の「Permission Overwrites」の節に合わせている。

`patches/@better-auth__oauth-provider` は、上流の issue #10213 の回避策である。
修正の PR #10266 が取り込まれたら、パッチを消す。

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
