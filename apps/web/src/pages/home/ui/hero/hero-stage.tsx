import type { ReactNode } from "react";

import { AnswerCard } from "./answer-card";
import { ChatLog } from "./chat-log";

const HeroStage = (): ReactNode => (
  <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 relative motion-safe:duration-1000 lg:col-span-7">
    <ChatLog />
    <AnswerCard />
  </div>
);

export { HeroStage };
