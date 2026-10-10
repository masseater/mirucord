import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";

import { SpeechBubble } from "./speech-bubble";

const MascotTip = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="flex items-end gap-3">
    <Mascot className="motion-safe:animate-wiggle size-20 shrink-0" />
    <div className="mb-6">
      <SpeechBubble>{children}</SpeechBubble>
    </div>
  </div>
);

export { MascotTip };
