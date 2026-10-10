import type { ReactNode } from "react";

const MARK = "Q.";

const MarqueeItem = ({
  question,
  hidden,
}: Readonly<{ question: string; hidden: boolean }>): ReactNode => (
  <li aria-hidden={hidden}>
    <span className="text-shu mr-2.5">{MARK}</span>
    {question}
  </li>
);

export { MarqueeItem };
