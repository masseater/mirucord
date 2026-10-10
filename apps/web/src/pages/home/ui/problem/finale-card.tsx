import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";

const LEAD = ["ミルが", "ぜんぶ見つけてきたよ！"] as const;
const LABEL = "キャンプの思い出";
const COUNT = "8";
const UNIT = "件";

const FinaleCard = (): ReactNode => (
  <div className="finale-card bg-milk text-ink border-ink shadow-pop relative grid w-full justify-items-center gap-3 rounded-3xl border-2 px-6 py-6">
    <Mascot className="motion-safe:animate-float size-28 md:size-44" />
    <p className="font-maru grid text-xl leading-tight font-black sm:text-2xl md:text-4xl">
      {LEAD.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </p>
    <p className="bg-butter flex items-baseline gap-1 rounded-full px-5 py-1 font-black">
      <span className="text-base md:text-lg">{LABEL}</span>
      <span className="text-grape text-5xl md:text-6xl">{COUNT}</span>
      <span className="text-lg md:text-xl">{UNIT}</span>
    </p>
  </div>
);

export { FinaleCard };
