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

本運用も本リリースもしていない（2026-10-12 時点）。データベースの破壊やアーキテクチャの再構築は好きなだけやってよい。

## 環境変数

- 環境変数は環境ごとに変わる値だけにする。変わらない値はコードか Alchemy の設定に、ツールにフラグがあればフラグにする。

## Cloudflare

- Workers Paid プランを前提にする。
- Paid に含まれる D1・Queues・Workers AI・Durable Objects などの無料枠は使ってよい。Free プランの上限は持ち出さない。
- ゾーンの WAF カスタムルールと Logpush のジョブは、masseater.dev ゾーンの持ち主の masseater/masseater.dev だけが持つ。ほかのリポは `OWNED_ZONE` を入れない。
- Worker にはすべて `logpush: true` を付ける。
- Bot Fight Mode は使わない。

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

## ライブラリ

- ライブラリが型を提供する値は、その型のまま `Schema.decode*` に渡す。
- ライブラリが export する型・スキーマ・enum・定数を書き写さない。
- 外部 API のクライアントは手で包まず、Effect 公式のパッケージ、distilled.cloud（Cloudflare は `@distilled.cloud/cloudflare`）、公開 OpenAPI から `@effect/openapi-generator` で生成、の順に選ぶ。

## PR とマージ

- PR のレビュー、PR ごとの CI・動作検証・デプロイはしない。動作は本番で確かめる。
- マージ前に base を取り込み、手元の `vp run verify` を通してから自分でマージする。マージしてよいかは聞かない。ルールセットのバイパスや `--admin` は使わない。

## jev-lint

- 有料の decider は、無料の `respan/span-01-lite` で判定できないルールだけに使う。判定できるかは、正解の分かる違反例と違反でない例を `--cache none --retry 3` で確かめる。span-01-lite は `kind: noul` のルールしか判定できない。
- ルールが使うモデルは、ユーザーの指示なしに変えない。

## 計測

- 推測せず計測する。実装や修正の前に本番で事実を確かめ、その結果だけで判断する。
- 機能開発の前に、AI が自分でデバッグできる仕組み（再現手段、ログやスパン、それを読む経路）を作る。
- 時間かお金を使う処理はすべてスパンにする。Workers 以外は `OtlpTracer.layerFromConfig` で出す。計測のためだけにコマンドやプロセスを包まない。
- ワークフローの最後には `.github/scripts/ci-telemetry.sh` を動かすジョブを置く。

## 脆弱性

- ZAP のアラートは警告も含めすぐ直す。誤検知だけを `.github/zap/rules.tsv` に書く。
- `audit` は `vp pm audit --fix` で直す。修正版の無い勧告だけを `auditConfig.ignoreGhsas` に載せ、理由をコミットメッセージに書く。

## スキル

- 複数リポで使う自作スキルは masseater/skills に置き、skills CLI で入れる。
