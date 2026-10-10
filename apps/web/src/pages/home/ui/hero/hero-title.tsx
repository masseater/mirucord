import type { ReactNode } from "react";

import { HeroActions } from "./hero-actions";

const BADGE = "Discord の思い出さがし";
const LEAD = "みんなの思い出を";
const FOCUS = "AI と掘り起こそう";
const SUB = "あの夜の名場面も ミルがさがしてきてくれます";

const HeroTitle = (): ReactNode => (
  <div className="relative flex flex-col items-start gap-6">
    <span className="border-ink bg-milk shadow-pop-sm rounded-full border-2 px-4 py-1.5 text-sm font-bold">
      {BADGE}
    </span>
    <h1 className="text-4xl leading-tight font-black sm:text-5xl lg:text-6xl">
      <span className="block">{LEAD}</span>
      <span className="marker-butter text-blurple">{FOCUS}</span>
    </h1>
    <p className="text-ink-soft text-lg leading-relaxed font-bold">{SUB}</p>
    <HeroActions />
  </div>
);

export { HeroTitle };
