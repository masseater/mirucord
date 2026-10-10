import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";
import { SpeechBubble } from "#/shared/ui/speech-bubble";

import { AnswerCard } from "./answer-card";
import { ChatLog } from "./chat-log";

const GUIDE = "ミルが見つけたよ";

const HeroStage = (): ReactNode => (
  <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 relative motion-safe:duration-1000">
    <ChatLog />
    <AnswerCard />
    <div className="absolute -bottom-12 left-20 md:-bottom-10 md:left-36">
      <SpeechBubble>{GUIDE}</SpeechBubble>
    </div>
    <Mascot className="motion-safe:animate-float absolute -bottom-6 -left-2 size-28 md:-bottom-6 md:-left-4 md:size-44" />
  </div>
);

export { HeroStage };
