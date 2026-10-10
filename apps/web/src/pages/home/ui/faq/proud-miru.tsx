import type { ReactNode } from "react";

import { SpeechBubble } from "#/shared/ui/speech-bubble";

import proudMiru from "./proud-miru.webp";

const BOAST = "えっへん！";

const ProudMiru = (): ReactNode => (
  <div className="text-ink flex items-end gap-2 py-2">
    <img
      src={proudMiru}
      alt=""
      width="384"
      height="384"
      loading="lazy"
      decoding="async"
      className="motion-safe:animate-float size-36 md:size-44"
    />
    <SpeechBubble>{BOAST}</SpeechBubble>
  </div>
);

export { ProudMiru };
