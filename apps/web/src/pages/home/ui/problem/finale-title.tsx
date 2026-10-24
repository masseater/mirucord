import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { MASCOT_NAME } from "#/shared/config";

const LINES = [`${MASCOT_NAME}が`, "ぜんぶ", "見つけてきたよ！"] as const;

const FinaleTitle = (): ReactNode => (
  <p className="finale-title finale-part font-maru grid justify-items-start font-black">
    {pipe(
      LINES,
      Array.map((line) => (
        <span key={line} className="finale-word finale-part">
          {line}
        </span>
      )),
    )}
  </p>
);

export { FinaleTitle };
