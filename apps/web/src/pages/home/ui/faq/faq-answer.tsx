import type { ReactNode } from "react";

import { Thinking } from "./thinking";

const FaqAnswer = ({
  answer,
  children,
}: Readonly<{ answer: string; children: ReactNode }>): ReactNode => (
  <div className="faq-reveal grid">
    <Thinking />
    <div className="faq-answer">
      <p>{answer}</p>
      <div className="faq-reactions">{children}</div>
    </div>
  </div>
);

export { FaqAnswer };
