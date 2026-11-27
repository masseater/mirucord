import type { ReactNode } from "react";

import { Reactions } from "#/pages/home/ui/message/reactions";
import type { Reaction } from "#/pages/home/ui/message/reactions";
import { Mascot } from "#/shared/brand";
import { MASCOT_NAME } from "#/shared/config";
import { CopyBlock } from "#/shared/ui/copy-block";

const THINKING = `${MASCOT_NAME}がさがし中…`;

export const FaqAnswer = ({
  answer,
  copy,
  reactions,
}: Readonly<{
  answer: string;
  copy?: string | undefined;
  reactions: readonly Reaction[];
}>): ReactNode => (
  <div className="faq-reveal grid">
    <p aria-hidden="true" className="faq-thinking text-dc-muted flex items-center gap-2 text-sm">
      <Mascot className="motion-safe:animate-wiggle size-6" />
      {THINKING}
    </p>
    <div className="faq-answer grid gap-2">
      <p>{answer}</p>
      {typeof copy === "string" && <CopyBlock text={copy} />}
      <Reactions items={reactions} className="faq-reactions" />
    </div>
  </div>
);
