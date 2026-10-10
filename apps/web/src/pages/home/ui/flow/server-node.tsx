import type { ReactNode } from "react";

import { DiscordMark } from "#/pages/home/ui/common/discord-mark";

const TITLE = "あなたのサーバー";
const CAPTION = "Bot を招待するだけ";

const ServerNode = (): ReactNode => (
  <g transform="translate(20 70)">
    <rect width="230" height="160" rx="22" className="fill-paper stroke-kinu" />
    <DiscordMark left="91" top="28" size="48" className="fill-discord" />
    <text x="115" y="110" textAnchor="middle" className="fill-sumi text-base font-bold">
      {TITLE}
    </text>
    <text x="115" y="134" textAnchor="middle" className="fill-nezumi text-sm">
      {CAPTION}
    </text>
  </g>
);

export { ServerNode };
