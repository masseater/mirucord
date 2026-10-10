# mirucord ロードマップ

mirucord は、Discord のサーバーを読むだけの MCP サーバーをホスティングで提供するサービスである。
コードと IaC はすべて公開し、運営を信用しない人は自前で動かせるようにする。

## 守る方針

提供するのは読み取りだけで、Discord への書き込み手段は作らない。
デプロイは main の CI からだけ行う。

メッセージ本文と投稿者名は、ギルドごとのデータ鍵で暗号化して D1 に保存する。
Vectorize に置くのはベクトルと `guildId`・`channelId` だけで、本文は置かない。
メッセージ本文と検索クエリを、ログ・span の属性・エラーメッセージに出さない。
Bot がサーバーから外れたら、そのサーバーの行とベクトルを消す。

検索結果は、MCP を使う人が Discord 上で閲覧できるチャンネルに限る。
範囲外のサーバーやチャンネルは、存在しない場合と同じ応答を返す。

## 決めたこと

| 項目                     | 決定                                                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 公開 URL                 | `https://mirucord.masseater.dev`（`src/shared/config/site.ts`）                                                                                                                            |
| MCP の認可               | better-auth の `@better-auth/mcp`（OAuth 2.1 と DCR）                                                                                                                                      |
| ログイン                 | Discord の OAuth で、scope は `identify` だけ。メールアドレスは集めない                                                                                                                    |
| embedding                | Workers AI の `@cf/baai/bge-m3`（1024 次元、cosine）                                                                                                                                       |
| 取り込み                 | Gateway は使わず、Cron と Queue で REST をポーリングする。5 分ごとに参加サーバーの確認と取り込み、1 時間ごとにチャンネル一覧を同期する。ダッシュボードを開いたときと更新ボタンでも同期する |
| 運営の閲覧               | 持たない。運営もサーバーの中身は読めない                                                                                                                                                   |
| 鍵                       | Cloudflare Secrets Store の `MIRUCORD_MASTER_KEY` で包む。Alchemy が作ってバインドする                                                                                                     |
| クラウド                 | Cloudflare だけを使い、AWS は使わない                                                                                                                                                      |
| 取り込みの同意           | Bot を入れただけでは読まない。管理者が `/dashboard` でサーバー単位に同意してから取り込む                                                                                                   |
| 取り込む範囲             | Bot が Discord で閲覧できるチャンネルそのもの。チャンネルを選ぶ画面は作らない                                                                                                              |
| 見えなくなったチャンネル | 取り込みを止め、30 日後に消す。管理画面からすぐ消すこともできる                                                                                                                            |
| Discord の REST          | `@discordeno/rest`。discord.js と `@discordjs/rest` は Workers で動かない                                                                                                                  |
| D1 の場所                | APAC                                                                                                                                                                                       |

## 今の状態

スライス 1〜7 はすべて main に入った。運用の手順は [runbook.md](runbook.md) にある。

## 外すもの

| 対象                                              | 外す条件                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `patches/@better-auth__oauth-provider`            | 上流の PR #10266（issue #10213）が取り込まれた版が出たとき                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `patches/@tanstack__eslint-plugin-start`          | `no-async-client-component` などの見逃しを直した版が出たとき                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `alchemy.run.ts` の旧 D1（`usDb`、ENAM）          | APAC の D1 で困っていないと本番で確かめたとき。`usDb` と `clone` の指定を外して出す                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| テストの `env.MESSAGES` と `env.AI` の `vi.spyOn` | miniflare が Vectorize と Workers AI をローカルで動かせるようになったとき。D1・Queues・Discord は `@cloudflare/vitest-plugin` の実物と MSW で動いている                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `ALERT_WEBHOOK_URL` への自作の通知                | Alchemy が `observability.issues` を扱えるようになったとき。Workers Observability の Issues に移す。alchemy 2.0.0-beta.81 の Worker の `observability` は logs と traces の設定だけで、`Alerting.NotificationPolicy` の `alertType` の型にも Workers のエラーを知らせる種類がない。ただし Cloudflare の Notifications の webhook 仕様には `workers_observability_alert` があり、型は任意の文字列も受ける。これで足りるかはまだ試していない。試すには本番に通知の設定を足し、本番でエラーを起こして届くか見る必要がある。クラウドのセッションには Cloudflare の認証がないので、main にマージしたデプロイで確かめる。進めるかはユーザーの判断を待っている |

## 引き継ぎの注意

チャンネル権限の計算（`shared/permissions/permissions.ts`）は、REST の値から計算できる保守されたパッケージがないため手で書いた。discord.js の `permissionsFor` は Client が持つギルドとメンバーのキャッシュを前提にする。discord-api-types は型と定数だけで、`@discordeno/utils` 21.0.0 の `calculatePermissions` はビットと名前を変換するだけで、上書きを解決しない。npm で「discord permission overwrites」と「discord permissions calculator」を探した。出てきた `@allzone/discord-perms` と `discord-permission` は、2021 年と 2023 年で更新が止まったビットの計算機だった。GitHub の issue や他のプロジェクトでも、REST の値から上書きを解決する保守されたライブラリは見つからず、out-of-your-element などは同じように手で書いている。順序は Discord 公式ドキュメント「Permission Overwrites」に合わせている。
`auth:generate` は `mcp()` の起動処理が D1 を読むので、D1 を差し替えた一時設定で動かす。
zod は禁止パッケージなので、`better-call` の peer をそろえるために足してはいけない。スキーマと検証は effect の Schema で書く。
`/sign-in` は MCP の OAuth のログイン画面も兼ねるので、ログイン後の行き先を `/dashboard` に固定しない。
