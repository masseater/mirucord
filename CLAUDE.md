@AGENTS.md

# CLAUDE.md

## このリポジトリ

mirucord は、Discord のサーバーを読むだけの MCP サーバーをホスティングで提供するサービスである。本番は `https://mirucord.masseater.dev` で動いている。
製品の方針と決まったことは docs/roadmap.md、本番の運用は docs/runbook.md、画面と文言は DESIGN.md に従う。

## 進め方

ユーザーへの報告は、結果と、ユーザーにしかできない操作が要るときだけにする。
ユーザーに手元での作業を頼まない。クラウドのセッションだけで終わらせる。
文言やデザインの指摘を1件受けたら、同じ基準でアプリの全画面を見直す。

## 最上位原則

強制・推奨・指示の手段は次の順で選ぶ。

1. ライブラリ公式の統合手段を使う。lint ルール、skill、plugin、CLI、diagnostics などである。
2. 公式になければ、既にそれを実現しているライブラリやツールを探して使う。
3. それもなければ、方針や注意点を提言しているブログ・issue・discussion を探して従う。
4. 自作は本当の最終手段である。自作するときは、何を探して何が合わなかったかをコミットメッセージに残す。

検査を通すために設定を無効化・簡易化したり、閾値を下げたりしてはならない。
数値の設定はツールの既定値を保つ。ただし既定値のままでは検査が機能しない場合（例: 0 が「上限なし」を意味する閾値）は、ツール公式の指針に従って機能する値を設定する。

## ドキュメントとコメント

ドキュメントはすぐ腐るため、必要最小限にする。
コードを説明する手書きドキュメントは書かない。価値があるのは自動生成されたものだけである。
手書きの文章はルートのCLAUDE.md・README.md・DESIGN.mdとルートのdocs/に限る。
docs/ に新しいファイルを増やさない。書き足すときは既存のファイルを更新し、終わった計画や経緯は消す。
リポジトリで管理するスキルは .claude/skills/ に置く。
コードコメントは書かず、lintが落とす。「なぜ」はコミットメッセージに書く。
lintの抑止ディレクティブはツールの既定で通るが、検査を通すために使ってはならない。

## 配置

設定を含むあらゆるものをワークスペース内に置く。
lint・fmt・checkだけは、Vite+の仕様によりルートの単一設定とする。
必須技術のパッケージはpnpmのstackカタログから参照する。未参照のカタログ項目と未使用の依存はfallowが落とす。
アプリのsrc/直下には、FSDのレイヤーだけを置く。
FSDはコロケーションが本質である。使われる場所の近くに置き、再利用されるまで切り出さない。

## パッケージマネージャー

pnpmは直接実行せず、`vp install`・`vp add`・`vp exec`・`vp dlx`・`vp pm`を使う。
Claude Codeでは `.claude/settings.json` が pnpm・pnpx・pn・pnx の実行を拒否する。
生成されたブロックにある `pnpm exec`・`pnpm dlx` は `vp exec`・`vp dlx` に読み替える。

## 状態

UI状態はeffect-atom、サーバー状態はTanStack Queryだけで扱う。
状態は排他的なstatusを持つ判別共用体で表し、booleanフラグの組を使わない。

## 自己改善

ユーザーと対話するセッションを始めたら、テンプレート更新の確認を求められていればそれを済ませてから、引数なしの `/loop` を起動する。内容は .claude/loop.md にある。

## 検証

作業の完了は `vp run verify` が通ることである。
pre-push フックは `vp run verify` と `vp run jev-lint` を動かす。`--no-verify` で飛ばさない。
jev-lint は LLM の利用料がかかるため、pre-push の差分検査と main の CI だけで動かし、デプロイの条件にしない。verify や編集フックに戻さない。
`.claude/hooks/fallow-gate.sh` は、未使用のコードがある間は Claude の commit と push を止める。部品だけを先に入れず、使う側と同じ PR にする。

クラウドのセッションでは、uv が `pypi.org` の証明書で失敗するので、`~/.config/uv/uv.toml` に `system-certs = true` を書いてから verify する。
GitHub Actions の Secrets API と Cloudflare の Global API Key はクラウドから使えない。`ci` スタックの適用など、それらが要る作業はユーザーの Mac で Remote Control を開いて行う。

## テンプレート

このリポジトリは masseater/typescript-template から作り、取り込んだバージョンを `.github/release-please/manifest.json` で追う。
フック・lint・CI など足場を変えたら、テンプレートにも同じ変更を入れ、release-please でリリースを出す。
新しいバージョンが出ると、セッション開始時に `.claude/hooks/template-release.ts` が知らせる。
