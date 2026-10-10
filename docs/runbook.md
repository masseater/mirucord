# mirucord 運用手順

公式版を運用するための手順をまとめる。自前で動かす場合も同じ手順で回せる。

## 設定

設定はすべて GitHub の Secrets と Variables に置き、main の CI の `deploy` ジョブが Alchemy に渡す。
必須のものとデプロイ用の Cloudflare トークンは `apps/web/alchemy.ci.ts` の `ci` スタックが作って書き込む。手で設定しない。
`ci` スタックは、トークンを発行できる Cloudflare の Global API Key と、Secrets を書ける GitHub トークンで適用する。

```sh
cd apps/web
CLOUDFLARE_API_KEY=... CLOUDFLARE_EMAIL=... CLOUDFLARE_ACCOUNT_ID=... GITHUB_TOKEN=... \
DISCORD_CLIENT_ID=... DISCORD_CLIENT_SECRET=... DISCORD_BOT_TOKEN=... OPENROUTER_API_KEY=... \
vp run deploy:ci
```

値を変えた後は、`ci` スタックを適用し、Actions から `verify` を手動で動かすとデプロイし直される。main への push でもよい。

| 名前                          | 種類      | 必須 | 内容                                                  |
| ----------------------------- | --------- | ---- | ----------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`        | Secrets   | 必須 | Alchemy がデプロイに使うトークン。`ci` スタックが作る |
| `CLOUDFLARE_ACCOUNT_ID`       | Secrets   | 必須 | デプロイ先のアカウント                                |
| `DISCORD_CLIENT_ID`           | Variables | 必須 | Discord アプリの ID                                   |
| `DISCORD_CLIENT_SECRET`       | Secrets   | 必須 | Discord の OAuth で使う                               |
| `DISCORD_BOT_TOKEN`           | Secrets   | 必須 | 取り込みと権限確認で使う Bot のトークン               |
| `MAX_GUILDS`                  | Variables | 任意 | 登録できるサーバー数の上限。既定は `100`              |
| `ALERT_WEBHOOK_URL`           | Secrets   | 任意 | 障害を知らせる Discord の Webhook URL                 |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Variables | 任意 | OTLP の送り先。設定しなければ Workers Logs だけに出す |
| `OTEL_EXPORTER_OTLP_HEADERS`  | Secrets   | 任意 | OTLP の送り先の認証ヘッダー                           |

`BETTER_AUTH_SECRET` と `MASTER_KEY` は Alchemy が初回に乱数で作り、状態に保存する。手で設定しない。

## デプロイ

main に入ったコミットは、`verify` が通った後に `deploy` ジョブが本番へ出す。手元からはデプロイしない。
main を出し直すときは `gh workflow run verify -R masseater/mirucord --ref main` で同じジョブを動かす。
D1 のマイグレーションは `apps/web/drizzle` にあり、デプロイのたびに Alchemy が未適用のものを当てる。

動いているコミットは `/api/health` で確かめる。

```sh
curl https://mirucord.masseater.dev/api/health
```

`version` がコミットの SHA、`deployedAt` がデプロイ時刻である。

## 切り戻し

コードの問題なら、原因のコミットを revert して main に入れる。CI が前の状態を出し直す。
CI を待てないときは、Cloudflare のダッシュボードで Worker の Deployments を開き、前のバージョンに戻す。
その後に revert を main に入れて、CI と本番をそろえる。

D1 の中身を壊したときは、D1 の Time Travel で壊す前の時刻に戻す。

```sh
vp exec wrangler d1 time-travel info <データベース名>
vp exec wrangler d1 time-travel restore <データベース名> --timestamp=<RFC3339 の時刻>
```

Vectorize には戻す仕組みがない。D1 を戻した後は、各チャンネルの取り込み位置も戻るので、次の Cron で取り込み直される。

## 障害の気づき方

次の場合に `ALERT_WEBHOOK_URL` へ通知する。同じ内容はエラーとして Workers Logs にも出る。

| 通知                                           | 意味                                                          |
| ---------------------------------------------- | ------------------------------------------------------------- |
| Guild sync could not list servers from Discord | Bot のトークンが無効か、Discord が落ちている                  |
| Channel ingest gave up after retries           | あるチャンネルの取り込みが 5 回続けて失敗し、Queue から捨てた |

ログは Cloudflare のダッシュボードの Workers Logs で読む。手元で流して見るときは次を使う。

```sh
vp exec wrangler tail <Worker 名>
```

## 取り込みを止める

取り込みは `src/features/ingest/api/sync-guilds.server.ts` の `ingest-enabled` フラグで止められる。
`defaultVariant` を `off` にして main に入れると、次の Cron から同期と取り込みが止まる。MCP での検索は続けられる。

## サーバー数の上限

登録済みのサーバーが `MAX_GUILDS` に達すると、その後に招待されたサーバーから Bot は自分で抜ける。
上限に達している間は、トップページの招待リンクの代わりに、新しいサーバーには追加できない旨を表示する。
上限を上げるときは Variables の `MAX_GUILDS` を変えてデプロイする。下げても、登録済みのサーバーは抜けない。

## 秘密の差し替え

| 対象                    | 手順                                                                        |
| ----------------------- | --------------------------------------------------------------------------- |
| `DISCORD_BOT_TOKEN`     | Discord の Developer Portal で作り直し、`ci` スタックを適用してデプロイする |
| `DISCORD_CLIENT_SECRET` | 同上。差し替えた後は、利用者は Discord でサインインし直す                   |
| `ALERT_WEBHOOK_URL`     | Discord で Webhook を作り直し、Secrets を差し替えてデプロイする             |

`MASTER_KEY` は差し替えない。保存済みの全サーバーの鍵がこれで包まれているため、変えると読めなくなる。
