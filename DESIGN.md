# DESIGN.md

mirucord の画面は、コミュニティの思い出をミルと一緒に掘り起こす体験として作る。
パステルの色、丸ゴシック、ステッカーのような太い影で、やわらかく親しみやすい見た目にそろえる。
LP、ログイン、管理画面、規約、MCP の同意画面はすべてこの文書に従う。

## 土台

UI は shadcn/ui の考え方で組み、共通部品は `apps/web/src/shared/ui` に置く。
色・余白・角丸・影はテーマトークンだけを使い、任意値を書かない。
トークンは `apps/web/src/app/styles.css` の `@theme` で定義する。
ブラウザの機能は Baseline Widely available の範囲で使い、実装は modern-web-guidance スキルの指針に従う。
画面はライトテーマだけで作り、ページの外枠に `scheme-light` を付ける。

## 色

背景は `cream` に `bg-dots` のドット柄を重ねる。
カードや吹き出しの地は `milk` にする。
文字と枠線と影は `ink` にする。
補足の文字は `ink-soft` にし、小さな文字でもコントラスト 4.5:1 を保つ。
アクセントはパステルの `lavender`・`mint`・`pink`・`butter`・`sky` を面に使う。
それぞれの `-deep` はアバターや図の線など、面積の小さい飾りにだけ使う。
`-deep` の上に `ink` 以外の小さな文字を載せない。
主要な操作は Discord を思わせる `blurple` にする。
危ない操作や取り消しは `pink` の面に `ink` の文字で示す。
Discord と Claude のロゴの色は `discord` と `claude` を使う。

## 文字

本文と見出しは Zen Maru Gothic で書き、`__root` で全ページに読み込む。
見出しは `font-black`、本文の強調とボタンは `font-bold` にする。
コマンドや暗号文など機械が読む文字列だけ JetBrains Mono にする。
縦書き、明朝体、白抜き文字は使わない。

## 形と影

カード、パネル、吹き出し、ボタンは `border-2 border-ink` の枠を持つ。
カードとパネルの角は `rounded-3xl`、ボタンとタグは `rounded-full` にする。
影はぼかさず、真下にずらした `shadow-pop` か `shadow-pop-sm` だけを使う。
大きな見せ場のカードは `shadow-pop`、管理画面のパネルやボタンは `shadow-pop-sm` にする。
ボタンは押すと影が消えて沈み、ホバーで少し浮く。

## 動き

動きはすべて `motion-safe:` で囲み、動きを減らす設定では止める。
ミルの `float`・`wiggle`・`blink` と、図の線の `flow` だけを使う。
流れ続ける要素には止めるための操作を付ける。

## ミル

ミルは虫めがねを持った丸いマスコットで、`#/shared/brand` の `Mascot` で描く。
ミルは案内役として、画面ごとに一言だけ話す。
話す内容は `SpeechBubble` に入れ、ミルの横か上に置く。
見出しの横で案内するときは `MascotTip` を使う。
ロゴではミルを小さく描き、動かさない。
ミルを悲しませたり、怒らせたりしない。

## 共通部品

| 部品           | 置き場所                      | 使いどころ               |
| -------------- | ----------------------------- | ------------------------ |
| `AppFrame`     | `shared/ui/app-frame/`        | LP 以外のページの外枠    |
| `Panel`        | `shared/ui/panel.tsx`         | 管理画面や規約のまとまり |
| `PopButton`    | `shared/ui/pop-button.tsx`    | 画面内の操作             |
| `PopLink`      | `shared/ui/pop-link.tsx`      | ボタンの見た目をした遷移 |
| `SpeechBubble` | `shared/ui/speech-bubble.tsx` | ミルのセリフ             |
| `MascotTip`    | `shared/ui/mascot-tip.tsx`    | ミルと吹き出しの組       |
| `Mascot`       | `shared/brand/mascot.tsx`     | ミル本体                 |

新しいページはまずこれらで組み、足りないときだけ部品を足す。
部品を足したら、この表に追記する。
LP だけの演出は `pages/home` に置き、ほかのページで使い始めたら `shared/ui` へ移す。
LP のボタン型リンクもその1つで、見た目は `PopButton` と同じ `popButtonVariants` を使う。

## 言葉

文章は友達に話すような、やわらかい「です・ます」かくだけた言い方にする。
業務ツールの言葉より、思い出やみんなといった身近な言葉を選ぶ。
見出しを「〜、〜。」のように読点で区切らない。
変な位置に読点を入れない。
説明は短くし、伝えたいことは図や画面のモックで見せる。
