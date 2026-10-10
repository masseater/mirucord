import type { ReactNode } from "react";

const OPEN = "+";
const CLOSE = "−";

const FaqItem = ({
  question,
  answer,
}: Readonly<{ question: string; answer: string }>): ReactNode => (
  <details className="group border-kinu bg-paper rounded-2xl border px-6 py-5">
    <summary className="flex cursor-pointer list-none justify-between gap-4 font-bold">
      {question}
      <span
        aria-hidden="true"
        className="text-shu font-mono text-xl leading-none group-open:hidden"
      >
        {OPEN}
      </span>
      <span
        aria-hidden="true"
        className="text-shu hidden font-mono text-xl leading-none group-open:inline"
      >
        {CLOSE}
      </span>
    </summary>
    <p className="text-sumi-soft mt-3.5 leading-loose">{answer}</p>
  </details>
);

export { FaqItem };
