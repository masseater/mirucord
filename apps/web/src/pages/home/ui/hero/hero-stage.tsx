import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";

import { AnswerCard } from "./answer-card";
import { ChatLog } from "./chat-log";

const GUIDE = "ミルが見つけたよ";

const HeroStage = (): ReactNode => (
  <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 relative motion-safe:duration-1000">
    <ChatLog />
    <AnswerCard />
    <span className="border-ink bg-milk absolute -bottom-12 left-20 rounded-2xl rounded-bl-none border-2 px-3 py-1 text-xs font-bold md:-bottom-10 md:left-36 md:text-sm">
      {GUIDE}
    </span>
    <Mascot className="motion-safe:animate-float absolute -bottom-6 -left-2 size-24 md:-bottom-4 md:left-2 md:size-36" />
  </div>
);

export { HeroStage };
