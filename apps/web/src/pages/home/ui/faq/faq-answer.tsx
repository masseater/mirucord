import type { ReactNode } from "react";

import { CopyBlock } from "#/pages/home/ui/common/copy-block";
import { Mascot } from "#/shared/brand";

const THINKING = "ミルがさがし中…";

const FaqAnswer = ({
  answer,
  copies,
  children,
}: Readonly<{ answer: string; copies: readonly string[]; children: ReactNode }>): ReactNode => (
  <div className="faq-reveal grid">
    <p aria-hidden="true" className="faq-thinking text-dc-muted flex items-center gap-2 text-sm">
      <Mascot className="motion-safe:animate-wiggle size-6" />
      {THINKING}
    </p>
    <div className="faq-answer grid gap-2">
      <p>{answer}</p>
      {copies.map((text) => (
        <CopyBlock key={text} text={text} />
      ))}
      <div className="faq-reactions">{children}</div>
    </div>
  </div>
);

export { FaqAnswer };
