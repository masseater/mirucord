import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";
import { SpeechBubble } from "#/shared/ui/speech-bubble";

const BOAST = "えっへん！";

const ProudMiru = (): ReactNode => (
  <div className="text-ink flex items-end gap-2 py-2">
    <Mascot className="motion-safe:animate-float size-36 md:size-44" />
    <SpeechBubble>{BOAST}</SpeechBubble>
  </div>
);

export { ProudMiru };
