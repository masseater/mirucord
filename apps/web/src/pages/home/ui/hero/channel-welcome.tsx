import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";

import { HeroActions } from "./hero-actions";

const LEAD = "みんなの思い出を";
const FOCUS = "AI と見つけよう";
const SUB = "あの夜の名場面も ミルがさがしてきてくれます";

const ChannelWelcome = (): ReactNode => (
  <div className="flex flex-col items-start gap-4 px-4 pt-6 pb-2">
    <span className="bg-lavender grid size-20 place-items-center rounded-full">
      <Mascot className="motion-safe:animate-float size-16" />
    </span>
    <h1 className="text-dc-bright font-maru text-4xl leading-tight font-black sm:text-5xl">
      <span className="block">{LEAD}</span>
      <span className="text-accent-lavender block">{FOCUS}</span>
    </h1>
    <p className="text-dc-muted text-lg">{SUB}</p>
    <HeroActions />
  </div>
);

export { ChannelWelcome };
