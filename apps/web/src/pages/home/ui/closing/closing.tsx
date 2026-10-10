import type { ReactNode } from "react";

import { ClosingActions } from "./closing-actions";
import { ClosingTitle } from "./closing-title";

const GLYPH = "索";
const LEAD = "過去の会話を";
const TAIL = "今日から資料に";

const Closing = (): ReactNode => (
  <div className="bg-sumi text-paper relative overflow-hidden py-40">
    <span
      aria-hidden="true"
      className="font-mincho text-outline-ash text-giant pointer-events-none absolute top-1/2 -right-12 -translate-y-1/2 font-black"
    >
      {GLYPH}
    </span>
    <div className="mx-auto w-full max-w-6xl px-5">
      <ClosingTitle lead={LEAD} tail={TAIL} />
      <ClosingActions />
    </div>
  </div>
);

export { Closing };
