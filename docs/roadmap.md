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

| 項目       | 決定                                                                    |
| ---------- | ----------------------------------------------------------------------- |
| 公開 URL   | `https://mirucord.masseater.dev`（`src/shared/config/site.ts`）         |
| MCP の認可 | better-auth の `@better-auth/mcp`（OAuth 2.1 と DCR）                   |
| ログイン   | Discord の OAuth で、scope は `identify` だけ。メールアドレスは集めない |
| embedding  | Workers AI の `@cf/baai/bge-m3`（1024 次元、cosine）                    |
| 取り込み   | Gateway は使わず、5 分ごとの Cron と Queue で REST をポーリングする     |
| 運営の閲覧 | サーバー管理者が `grant_support_access` で時間を決めて許可した間だけ    |
| 公式版の鍵 | AWS KMS で作る。自前運用の既定は `MASTER_KEY`                           |

## 今の状態

スライス 1〜7 はすべて main に入った。運用の手順は [runbook.md](runbook.md) にある。

## 外すもの

| 対象                                     | 外す条件                                                                                                                                |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `patches/@better-auth__oauth-provider`   | 上流の PR #10266（issue #10213）が取り込まれた版が出たとき                                                                              |
| `patches/@tanstack__eslint-plugin-start` | `no-async-client-component` などの見逃しを直した版が出たとき                                                                            |
| `ALERT_WEBHOOK_URL` への自作の通知       | Alchemy が `observability.issues` を扱えるようになったとき。Workers Observability の Issues に移す。調べた手段はコミット 56ccdc6 にある |

## 引き継ぎの注意

チャンネル権限の計算（`features/mcp/model/permissions.ts`）は、REST の値から計算できる保守されたパッケージがないため手で書いた。順序は Discord 公式ドキュメント「Permission Overwrites」に合わせている。
`auth:generate` は `mcp()` の起動処理が D1 を読むので、D1 を差し替えた一時設定で動かす。
zod は禁止パッケージなので、`better-call` の peer をそろえるために足してはいけない。
