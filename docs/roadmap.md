# mirucord ロードマップ

mirucord は、Discord のサーバーを読むだけの MCP サーバーをホスティングで提供するサービスである。
コードと IaC はすべて公開し、運営を信用しない人は自前で動かせるようにする。

## 守る方針

提供するのは読み取りだけで、Discord への書き込み手段は作らない。
デプロイは main の CI からだけ行う。

メッセージ本文と投稿者名は、ギルドごとのデータ鍵で暗号化し、ギルドごとの Durable Object に保存する。
検索の索引には、本文の 1〜3 文字の断片をデータ鍵から導いた HMAC 鍵でハッシュにした値だけを置き、本文は置かない。平文の全文検索の索引は作らない。
メッセージ本文と検索クエリを、ログ・span の属性・エラーメッセージに出さない。
Bot がサーバーから外れたら、そのサーバーの行と索引を消す。

検索結果は、MCP を使う人が Discord 上で閲覧できるチャンネルに限る。
範囲外のサーバーやチャンネルは、存在しない場合と同じ応答を返す。

## 決めたこと

| 項目                     | 決定                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 公開 URL                 | `https://mirucord.masseater.dev`（`src/shared/config/site.ts`）                                                                                                                                                                                                                                                                                                    |
| MCP の認可               | better-auth の `@better-auth/mcp`（OAuth 2.1 と DCR）                                                                                                                                                                                                                                                                                                              |
| ログイン                 | Discord の OAuth で、scope は `identify` だけ。メールアドレスは集めない                                                                                                                                                                                                                                                                                            |
| 検索                     | ベクトル検索は使わない。`find_messages` の言葉をそのまま含むメッセージを、ギルドごとの Durable Object の FTS5（contentless）に入れたハッシュの索引で引き、復号して照合する                                                                                                                                                                                         |
| 画像                     | 添付画像（1 件 4 枚まで）に Workers AI の `@cf/google/gemma-4-26b-a4b-it` で日本語の説明を付け、本文と一緒に索引に入れる。説明は添付の `description` として本文と同じく暗号化して保存する                                                                                                                                                                          |
| 取り込み                 | Cron と Queue で REST をポーリングする。1 時間ごとに参加サーバーの確認と取り込み、チャンネル一覧の同期をする。新しいメッセージは Gateway で受けるので、ポーリングは取りこぼしを拾う整合性の確認にとどめる。Queues の無料枠（1 日 1 万操作）に収めるためである。ダッシュボードを開いたときと更新ボタンでも同期する                                                  |
| 編集と削除               | fly.io の Machine（shared-cpu-1x・256MB・1 台）で Gateway に常時つなぎ、メッセージの作成・編集・削除を署名付きで Worker に送り、Worker は Queue を通さずにその場で保存・削除する。Gateway の常時接続は Durable Object では無料枠をすぐ超えるので fly.io に置く。切断中の取りこぼしは、取り込みのたびに古い履歴を 1 ページずつ巡回して拾う                          |
| 運営の閲覧               | 持たない。運営もサーバーの中身は読めない                                                                                                                                                                                                                                                                                                                           |
| 鍵                       | Cloudflare Secrets Store の `MIRUCORD_MASTER_KEY` で包む。Alchemy が作ってバインドする                                                                                                                                                                                                                                                                             |
| クラウド                 | Cloudflare を使い、Gateway の常駐だけ fly.io に置く。AWS は使わない                                                                                                                                                                                                                                                                                                |
| 取り込みの同意           | Bot を入れただけでは読まない。管理者が `/dashboard` でサーバー単位に同意してから取り込む                                                                                                                                                                                                                                                                           |
| 取り込む範囲             | Bot が Discord で閲覧できるチャンネルそのもの。チャンネルを選ぶ画面は作らない                                                                                                                                                                                                                                                                                      |
| 見えなくなったチャンネル | 取り込みを止め、30 日後に消す。管理画面からすぐ消すこともできる                                                                                                                                                                                                                                                                                                    |
| Discord の REST          | `@discordeno/rest`。discord.js と `@discordjs/rest` は Workers で動かない                                                                                                                                                                                                                                                                                          |
| 投稿者の削除依頼         | ログインした人は管理画面から、サーバーごとに保存された自分の投稿を消せる。ギルドの Durable Object の `erased_author` に Discord のユーザー ID を残し、書き込みのたびにその人の投稿を捨てる。同意の取り消しや Bot の退出で行を消しても、`erased_author` は残す。Developer Terms 5(b) の「本人の依頼で速やかに削除し、依頼の容易な手段を用意する」に応えるためである |
| 管理者以外の DL          | メンバーも DL できるようにする。管理者の同意にこれを含める                                                                                                                                                                                                                                                                                                         |
| AI クライアントへの送信  | 利用規約第5条6項とプライバシーポリシー第4条2項に、メンバーが連携した AI クライアントへ他のメンバーの投稿も送られることを書く                                                                                                                                                                                                                                       |
| D1 の場所                | APAC                                                                                                                                                                                                                                                                                                                                                               |

## 検討事項

Discord の規約（Developer Terms of Service、Developer Policy）に合わせて、次を決める。

| 項目                   | 決めること                                                                                                                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 課金の単位             | Developer Policy 18 は API Data の販売・商業化を禁じる。課金は機能（プランに含む DL 回数、または DL の権利の都度購入）に付け、データの件数に値段を付けない                                                           |
| Premium Apps の併設    | Developer Policy の Monetization Requirements は、Premium Apps の対応地域で有料機能を Discord 経由でも同価格以下で売ることを求める。日本は対象外だが、「地域」が開発者と購入者のどちらを指すかは規約から決められない |
| Message Content intent | 利用者が 1 万人を超えると審査制になり、毎年再審査がある。審査で用途とデータの扱いを説明できるようにする                                                                                                              |

## 今の状態

スライス 1〜7 はすべて main に入った。

## 外すもの

| 対象                                     | 外す条件                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `patches/@better-auth__oauth-provider`   | 上流の PR #10266（issue #10213）が取り込まれた版が出たとき                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `patches/@tanstack__eslint-plugin-start` | `no-async-client-component` などの見逃しを直した版が出たとき                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| テストの `env.AI` の `vi.spyOn`          | miniflare が Workers AI をローカルで動かせるようになったとき。D1・Durable Objects・Queues・Discord は `@cloudflare/vitest-plugin` の実物と MSW で動いている                                                                                                                                                                                                                                                                                                                                                              |
| `ALERT_WEBHOOK_URL` への自作の通知       | Workers Issues の Automations を IaC で作れるようになったとき。Issues 自体は `alchemy.run.ts` の `WorkerIssues` が script-settings の `observability.issues` で有効にしている。Automations の API（`/workers/observability/issues/automations`）は公開スキーマにあるが、必須の `policyId` が指す Notifications のポリシーに Workers Issues 用の `alert_type` が文書にない。公開の `alert_type` の列挙にもなく、推測では作らない。Cloudflare への書き込みは IaC からだけ行うので、ダッシュボードや API で直接は設定しない |

## 引き継ぎの注意

チャンネル権限の計算（`shared/permissions/permissions.ts`）は、REST の値から計算できる保守されたパッケージがないため手で書いた。discord.js の `permissionsFor` は Client が持つギルドとメンバーのキャッシュを前提にする。discord-api-types は型と定数だけで、`@discordeno/utils` 21.0.0 の `calculatePermissions` はビットと名前を変換するだけで、上書きを解決しない。npm で「discord permission overwrites」と「discord permissions calculator」を探した。出てきた `@allzone/discord-perms` と `discord-permission` は、2021 年と 2023 年で更新が止まったビットの計算機だった。GitHub の issue や他のプロジェクトでも、REST の値から上書きを解決する保守されたライブラリは見つからず、out-of-your-element などは同じように手で書いている。順序は Discord 公式ドキュメント「Permission Overwrites」に合わせている。
`auth:generate` は `mcp()` の起動処理が D1 を読むので、D1 を差し替えた一時設定で動かす。
zod は禁止パッケージなので、`better-call` の peer をそろえるために足してはいけない。スキーマと検証は effect の Schema で書く。
`/sign-in` は MCP の OAuth のログイン画面も兼ねるので、ログイン後の行き先を `/dashboard` に固定しない。
サーバーごとの Durable Object（`entities/guild-message`）のマイグレーションは `import.meta.glob` の `?raw` で読む。drizzle-kit の `migrations.js` に戻すと vitest が `.sql` を読めずに落ちる。
FTS5 の索引 `message_search` は drizzle の通常のテーブルとして宣言し、隠し列への `eq` で MATCH する。仮想テーブルは手書きのマイグレーションで作る。
