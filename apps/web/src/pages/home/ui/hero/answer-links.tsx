import type { ReactNode } from "react";

import { MEMORY_ID } from "./memory";

const SOURCE = "#ざつだん 22:14";
const CITATION = "思い出を 4 件みつけたよ";

const AnswerLinks = (): ReactNode => (
  <p className="flex flex-wrap gap-2 text-xs font-bold">
    <a href={`#${MEMORY_ID}`} className="bg-sky text-ink rounded-full px-3 py-1 no-underline">
      {SOURCE}
    </a>
    <span className="bg-mint rounded-full px-3 py-1">{CITATION}</span>
  </p>
);

export { AnswerLinks };
