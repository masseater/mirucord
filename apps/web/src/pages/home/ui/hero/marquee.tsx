import type { ReactNode } from "react";

import { MarqueeItem } from "./marquee-item";

const QUESTIONS = [
  "はじめてみんなで遊んだゲームってなに？",
  "去年のオフ会のお店どこだっけ？",
  "このサーバーができた日の会話を見せて",
  "いちばん盛り上がった夜はいつ？",
  "あのとき決めたチーム名なんだっけ？",
  "みんなで笑った名言を集めて",
] as const;

const TONES = ["bg-pink", "bg-butter", "bg-sky", "bg-lavender", "bg-milk"] as const;

const TRACK = [
  ...QUESTIONS.map((question, index) => ({
    key: `a-${question}`,
    question,
    tone: TONES[index] ?? "bg-milk",
    hidden: false,
  })),
  ...QUESTIONS.map((question, index) => ({
    key: `b-${question}`,
    question,
    tone: TONES[index] ?? "bg-milk",
    hidden: true,
  })),
];

const PAUSE_ID = "marquee-pause";
const PAUSE = "とめる";

const Marquee = (): ReactNode => (
  <div className="border-ink bg-milk relative overflow-hidden border-y-2 py-5">
    <input id={PAUSE_ID} type="checkbox" className="peer sr-only" />
    <label
      htmlFor={PAUSE_ID}
      className="border-ink bg-milk peer-focus-visible:ring-lavender-deep peer-checked:bg-ink peer-checked:text-milk absolute top-1/2 right-3 z-10 -translate-y-1/2 cursor-pointer rounded-full border-2 px-3 py-1 text-xs font-bold peer-focus-visible:ring-2"
    >
      {PAUSE}
    </label>
    <ul className="motion-safe:animate-marquee hover:paused peer-checked:paused flex w-max gap-5 pr-5 font-bold whitespace-nowrap">
      {TRACK.map((item) => (
        <MarqueeItem
          key={item.key}
          question={item.question}
          tone={item.tone}
          hidden={item.hidden}
        />
      ))}
    </ul>
  </div>
);

export { Marquee };
