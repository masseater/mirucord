# mirucord

Claude のような AI アプリから、自分が入っている Discord サーバーの過去の会話を探して読めるようにする、読み取り専用の MCP サーバーである。
チャンネルやスレッドに散らばった話を、キーワードや意味の近さで AI に探させられる。

## 公開先

- Web: https://mirucord.masseater.dev
- MCP サーバー: https://mirucord.masseater.dev/mcp

いまは無料で、入れられるのは先着 80 サーバーまでである。

## 使い方

サーバーの管理権限が要るのは、最初の招待と同意のときだけである。
そのあとはメンバーの誰でも、自分が読めるチャンネルの中だけを探せる。

### サーバーに入れる

サーバーの管理者が https://mirucord.masseater.dev を開き、招待ボタンから Bot をサーバーに入れる。
続けて https://mirucord.masseater.dev/dashboard に Discord でログインし、サーバーの取り込みに同意する。

### AI アプリにつなぐ

使う人は、AI アプリに `https://mirucord.masseater.dev/mcp` を MCP のコネクタとして登録する。
Claude なら、設定のコネクタからカスタムコネクタを追加して URL を入れる。
初めて使うときに Discord でログインし、同意の画面で許可する。

取り込みが終わったら、AI に「去年の夏の思い出を教えて」のように聞くと、サーバーの会話から探して答える。

Bot は Discord に書き込まず、DM も読まない。
メッセージの本文は暗号化して保存し、Bot をサーバーから外すとそのサーバーのデータは消える。

## 自分の環境で動かす

コードとインフラの定義はすべて公開している。
自分の Cloudflare と fly.io のアカウントで同じものを動かす手順は、[セルフホストのページ](https://mirucord.masseater.dev/self-host)にある。

## ライセンス

[GNU Affero General Public License v3.0](LICENSE) で公開している。
