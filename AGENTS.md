<!-- intent-skills:start -->
## Skill Loading

Use the repository’s installed Intent. If it is unavailable, report the missing dependency instead of downloading a replacement.
Before editing files for a substantial task:
- Run `pnpm exec intent list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm exec intent load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

## 運用の段階

2026-10-12 時点では、本運用も本リリースもしていない。masseater 自身とその友人だけが試している。
そのため、データベースの破壊やアーキテクチャの再構築は好きなだけやってよい。

## Cloudflare のプラン

本番の Cloudflare は Workers Paid（月 5 ドル）を契約している前提で考える。2026-10-11 に Free から切り替えた。
Paid に含まれる D1・Queues・Workers AI・Durable Objects などの無料枠は使ってよい。Free プランの日次上限は関係ないので、Free の話を持ち出さない。

## 想定規模と性能要件

設計・負荷試算・費用試算は、今の規模ではなく次の規模を前提にする。参加者の半分が日常的に使うのが当たり前になった状態で困らないことが目標である。

| 項目 | 前提 |
| --- | --- |
| サーバー数 | 500 鯖 |
| 1 鯖の人数 | 平均 200 人、最大 1,000 人 |
| 日常的に使う人 | 各鯖の参加者の半数 |

この規模で次の量を捌けることを要件とする。1 人あたりの使い方から導いた値ではなく、目標として置いた値である。

| 項目 | 要件 |
| --- | --- |
| 1 鯖の同時リクエスト | 1,000 件 |
| 全体のリクエスト | 毎秒 1,000 件 |
| 取り込むメッセージ | 1 鯖 1 日 2,000 件 |
| 検索 1 回の応答時間 | 上の負荷のもとで、Worker が受けてから返すまで p50 200ms、p90 1 秒。p99 には上限を置かず、長くかかるものは MCP の task 機能で非同期に返す |

- 鯖の人数・投稿数・リクエスト数・DO の行数や容量や実時間は、推定で済ませず、Cloudflare の GraphQL Analytics API と Discord API で本番の値を取ってから試算に使う。取った値と日付を試算に書く。
- 「作業配信」はサーバー名であり、配信者の鯖ではない。

## 環境変数と認証

- 環境変数は必要最小限にする。環境変数が一つ増えるだけで、どの環境で何を設定するかという考慮事項が爆発的に増えるためである。
- 環境変数にしてよいのは、設定や認証に限らず、本当に環境ごとに変わる値だけである。環境で変わらない値はコードや Alchemy の設定に書き、ツールにフラグがあればフラグを使う。
- Cloudflare などのクラウドの認証は Alchemy のプロファイルで管理する。

## レビューとCI

- PRのレビューは行わない。PRは作ったらすぐマージする。
- PR単位のCIは走らせない。`pull_request` トリガーのワークフローを追加しない。
- CIはmainへのpushで必ず走らせる。ワークフローは `.github/workflows/verify.yml` である。
- デプロイやリリースのジョブは、同じワークフローで `needs: verify` を指定し、mainの必須CIが通ってから実行する。
- マージ前の確認は手元の `vp run verify` で行う。
- PRごとの動作検証やデプロイはしない。動作の確認は、mainにマージしてデプロイされた本番で実測して行う。
- Claude のクラウドセッションではプロキシが GitHub API を拒むため、`actions-lint` タスク（`vite.config.ts`）は `CLAUDE_CODE_REMOTE` が設定されていると zizmor に `--no-online-audits` を付け、オフライン監査だけを行う。フックにも渡る環境変数で切り替えるため、Stop フックの verify でも同じになる。オンライン監査は main の CI（`.github/workflows/verify.yml`）が担う。

## jev-lint

- ルールは `.jev-lint.yaml` に置き、無料の `respan/span-01-lite` で判定できないものだけを有料の decider で判定する。判定できるかは、正解の分かる違反例と、このリポジトリの書き方どおりに書いた違反でない例を `--cache none --retry 3` で判定させて確かめる。無料で判定できるルールにまで課金しないためである。
- span-01-lite は `kind: noul` のルールしか判定できない。

## 計測

- 推測するな、計測しろ。仮説を立てたら、実装や修正の前に計測で事実を確かめ、その結果だけで判断する。
- 機能開発に取り掛かる前に、AIが自分でデバッグできる仕組みを必ず作る。再現手段、ログやスパン、その出力を読む経路の3つである。
- 計測は本番環境で行えるようにする。できないときは、あらゆる手段で本番同等を保証したステージング環境を作って行う。手元やテスト環境だけの計測は判断の根拠にしない。
- 実践の手順は `measure-dont-guess` スキル（`.claude/skills/measure-dont-guess/SKILL.md`）にある。不具合の調査は `systematic-debugging`、完了の確認は `verification-before-completion` スキルに従う。

## ベース

- このリポジトリのベースは https://github.com/masseater/typescript-template である。テンプレート由来の構成・方針はテンプレートに従う。
