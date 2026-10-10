import type { ReactNode } from "react";

const MARK = "Q";
const OPEN = "+";

const FaqItem = ({
  question,
  answer,
}: Readonly<{ question: string; answer: string }>): ReactNode => (
  <details className="group border-ink bg-milk open:shadow-pop-sm rounded-3xl border-2 px-5 py-4">
    <summary className="flex cursor-pointer list-none items-center gap-3 font-black">
      <span className="bg-lavender grid size-8 shrink-0 place-items-center rounded-full">
        {MARK}
      </span>
      <span className="grow">{question}</span>
      <span
        aria-hidden="true"
        className="text-blurple text-2xl leading-none transition-transform group-open:rotate-45"
      >
        {OPEN}
      </span>
    </summary>
    <p className="text-ink-soft mt-3 pl-11 leading-loose">{answer}</p>
  </details>
);

export { FaqItem };
