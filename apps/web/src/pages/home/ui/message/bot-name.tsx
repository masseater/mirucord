import type { ReactNode } from "react";

const NAME = "ミル";
const BADGE = "APP";

const BotName = (): ReactNode => (
  <>
    <span className="text-accent-lavender font-bold">{NAME}</span>
    <span className="bg-blurple text-dc-bright rounded-sm px-1 text-xs leading-4 font-bold">
      {BADGE}
    </span>
  </>
);

export { BotName };
