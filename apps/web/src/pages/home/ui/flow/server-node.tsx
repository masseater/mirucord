import type { ReactNode } from "react";

import { DiscordMark } from "#/pages/home/ui/common/discord-mark";

const TITLE = "みんなのサーバー";
const CAPTION = "Bot を招待するだけ";

const ServerNode = ({ left, top }: Readonly<{ left: string; top: string }>): ReactNode => (
  <g transform={`translate(${left} ${top})`}>
    <rect y="8" width="230" height="160" rx="40" className="fill-ink" />
    <rect width="230" height="160" rx="40" className="fill-lavender stroke-ink" strokeWidth="3" />
    <DiscordMark left="91" top="26" size="48" className="fill-discord" />
    <text x="115" y="108" textAnchor="middle" className="fill-ink text-base font-black">
      {TITLE}
    </text>
    <text x="115" y="132" textAnchor="middle" className="fill-ink-soft text-sm font-bold">
      {CAPTION}
    </text>
  </g>
);

export { ServerNode };
