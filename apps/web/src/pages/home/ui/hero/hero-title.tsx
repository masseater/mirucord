import type { ReactNode } from "react";

import { HeroTitleFocus } from "./hero-title-focus";

const KICKER = "MCP SERVER FOR DISCORD";
const TAGLINE = "Discord サーバーを AI の索引に";
const LEAD = "埋もれた会話を";

const HeroTitle = (): ReactNode => (
  <div className="order-first flex items-start justify-end gap-8 lg:order-none lg:col-span-5">
    <div className="writing-vertical flex gap-5 pt-2">
      <span className="text-nezumi font-mono text-xs tracking-widest">{KICKER}</span>
      <span className="text-sumi-soft tracking-widest">{TAGLINE}</span>
    </div>
    <h1 className="font-mincho writing-vertical text-5xl leading-snug font-black tracking-wider whitespace-nowrap md:text-6xl lg:text-7xl">
      <span className="block">{LEAD}</span>
      <HeroTitleFocus />
    </h1>
  </div>
);

export { HeroTitle };
