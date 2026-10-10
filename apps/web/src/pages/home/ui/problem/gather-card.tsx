import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";

const LEAD = ["ミルが", "ぜんぶ見つけてきたよ！"] as const;
const COUNT = "キャンプの思い出 8 件";

const GatherCard = (): ReactNode => (
  <div className="scene-caption bg-milk text-ink grid justify-items-center gap-2 rounded-lg px-5 py-4">
    <Mascot className="motion-safe:animate-float size-20" />
    <p className="font-maru grid text-xl leading-snug font-black md:text-2xl">
      {LEAD.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </p>
    <p className="bg-mint rounded-full px-3 py-1 text-sm font-bold">{COUNT}</p>
  </div>
);

export { GatherCard };
