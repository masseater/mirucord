import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";

const THINKING = "ミルがさがし中…";

const FaqAnswer = ({
  answer,
  children,
}: Readonly<{ answer: string; children: ReactNode }>): ReactNode => (
  <div className="faq-reveal grid">
    <p aria-hidden="true" className="faq-thinking text-dc-muted flex items-center gap-2 text-sm">
      <Mascot className="motion-safe:animate-wiggle size-6" />
      {THINKING}
    </p>
    <div className="faq-answer">
      <p>{answer}</p>
      <div className="faq-reactions">{children}</div>
    </div>
  </div>
);

export { FaqAnswer };
