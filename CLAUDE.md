@AGENTS.md

# CLAUDE.md

## このリポジトリ

mirucord は、Discord のサーバーを読むだけの MCP サーバーをホスティングで提供するサービスである。本番は `https://mirucord.masseater.dev` で動いている。
これからやることと未決の検討事項は docs/roadmap.md に書く。画面と文言は DESIGN.md に従う。

## 進め方

ユーザーへの報告は、結果と、ユーザーにしかできない操作が要るときだけにする。
ユーザーに手元での作業を頼まない。クラウドのセッションだけで終わらせる。
文言やデザインの指摘を1件受けたら、同じ基準でアプリの全画面を見直す。

## 最上位原則

強制・推奨・指示の手段は次の順で選ぶ。自作するときは、何を探して何が合わなかったかをコミットメッセージに残す。

1. ライブラリ公式の統合手段（lint ルール、skill、plugin、CLI、diagnostics など）
2. それを実現している既存のライブラリやツール
3. 方針を提言しているブログ・issue・discussion
4. 自作

検査を通すために設定を無効化・簡易化したり、閾値を下げたり、抑止ディレクティブを使ったりしない。
数値の設定はツールの既定値を保ち、既定値で検査が機能しないときだけ公式の指針で設定する。

## 文書

手書きの文章はルートの CLAUDE.md・README.md・DESIGN.md と docs/ に限り、コードを読めば分かることは書かない。
docs/ に新しいファイルを増やさない。既存のファイルを更新し、終わった計画や経緯は消す。
リポジトリで管理するスキルは .claude/skills/ に置く。
「なぜ」はコミットメッセージに書く。

## 配置

設定を含め、すべてワークスペース内に置く。
ワークスペースは apps・libs・tools・infra に分け、アプリのデプロイ設定は apps に置いて infra の部品を使う。
アプリの src/ 直下には FSD のレイヤーだけを置く。使われる場所の近くに置き、再利用されるまで切り出さない。
定数・設定値・スキーマ・ルールの ID は一か所で定義し、ほかはそこから参照する。
ドメイン、リポジトリ名、鍵の導出に使う文字列は定数に寄せない。

## Alchemy

足りない設定は alchemy にパッチを当てず、カスタムリソースで定義する。
`APP_NAME` は `SERVICE_NAME` と別に持つ。
`APP_NAME` やスタック名を変えると、Random の値も含めてリソースは作り直される。スタック名を変えるときは、先に state を新しいスタック名へ写す。

## その他

生成されたブロックの `pnpm exec`・`pnpm dlx` は `vp exec`・`vp dlx` に読み替える。
UI 状態は effect-atom、サーバー状態は TanStack Query だけで扱う。状態は排他的な status を持つ判別共用体で表す。
ユーザーと対話するセッションを始めたら、テンプレート更新の確認を求められていればそれを済ませてから、引数なしの `/loop` を起動する。
作業の完了は `vp run verify` が通ることである。
pre-push フックを `--no-verify` で飛ばさない。
jev-lint は pre-push の差分検査と main の CI だけで動かし、デプロイの条件にしない。verify や編集フックに戻さない。
部品だけを先に入れず、使う側と同じ PR にする。

クラウドのセッションでは、`~/.config/uv/uv.toml` に `system-certs = true` を書いてから verify する。
`mirucord-ci` スタックの適用など、GitHub Actions の Secrets API と Cloudflare の Global API Key が要る作業は、ユーザーの Mac の Remote Control で行う。

## テンプレート

フック・lint・CI など足場を変えたら、masseater/typescript-template にも同じ変更を入れ、release-please でリリースを出す。
