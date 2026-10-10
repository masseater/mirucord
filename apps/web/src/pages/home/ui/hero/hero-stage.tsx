import type { ReactNode } from "react";

import { Mascot } from "#/pages/home/ui/common/mascot";

import { AnswerCard } from "./answer-card";
import { ChatLog } from "./chat-log";

const HeroStage = (): ReactNode => (
  <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 relative motion-safe:duration-1000">
    <ChatLog />
    <AnswerCard />
    <Mascot className="motion-safe:animate-float absolute -bottom-6 -left-2 size-24 md:-bottom-4 md:left-2 md:size-36" />
  </div>
);

export { HeroStage };
