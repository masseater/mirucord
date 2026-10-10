import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";
import { SpeechBubble } from "#/shared/ui/speech-bubble";

const FOUND = "みっけ！";

const SeekMiru = ({
  kind,
  step,
}: Readonly<{ kind: "pass" | "found"; step: "0" | "1" | "2" }>): ReactNode => (
  <span aria-hidden="true" className="seek" data-kind={kind} data-seek={step}>
    <span className="seek-flash bg-dc-highlight" />
    <span className="seek-miru text-ink items-center gap-1">
      {kind === "found" && <SpeechBubble>{FOUND}</SpeechBubble>}
      <Mascot className="size-12" />
    </span>
  </span>
);

export { SeekMiru };
