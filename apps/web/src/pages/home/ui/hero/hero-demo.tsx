import type { ReactNode } from "react";

import { AnswerWindow } from "./answer-window";
import { ChatLog } from "./chat-log";

const HeroDemo = (): ReactNode => (
  <div className="xl:grid xl:grid-cols-2 xl:items-center">
    <ChatLog />
    <AnswerWindow />
  </div>
);

export { HeroDemo };
