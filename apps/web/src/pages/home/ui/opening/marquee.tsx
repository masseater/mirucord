import type { ReactNode } from "react";

import { MarqueeItem } from "./marquee-item";

const QUESTIONS = [
  "先月のリリースで決まったことは？",
  "新メンバー向けのルールはどこに書いた？",
  "去年のオフ会の店の名前は？",
  "ビルドが落ちたときの対処法を教えて",
  "A 案と B 案の議論をまとめて",
  "イベントの集合時間っていつだっけ？",
] as const;

const TRACK = [
  ...QUESTIONS.map((question) => ({ key: `a-${question}`, question, hidden: false })),
  ...QUESTIONS.map((question) => ({ key: `b-${question}`, question, hidden: true })),
];

const PAUSE_ID = "marquee-pause";
const PAUSE = "流れを止める";

const Marquee = (): ReactNode => (
  <div className="border-sumi bg-paper relative overflow-hidden border-y py-4">
    <input id={PAUSE_ID} type="checkbox" className="peer sr-only" />
    <label
      htmlFor={PAUSE_ID}
      className="border-sumi bg-paper peer-focus-visible:ring-shu peer-checked:bg-sumi peer-checked:text-paper absolute top-1/2 right-3 z-10 -translate-y-1/2 cursor-pointer rounded-full border px-3 py-1 text-xs font-bold peer-focus-visible:ring-2"
    >
      {PAUSE}
    </label>
    <ul className="motion-safe:animate-marquee hover:paused peer-checked:paused flex w-max gap-14 pr-14 font-mono whitespace-nowrap">
      {TRACK.map((item) => (
        <MarqueeItem key={item.key} question={item.question} hidden={item.hidden} />
      ))}
    </ul>
  </div>
);

export { Marquee };
