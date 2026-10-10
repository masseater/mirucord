import type { ReactNode } from "react";

import { DiscordMark } from "#/pages/home/ui/common/discord-mark";

import { ActiveServer } from "./active-server";

const OTHERS = ["げ", "お"] as const;
const ADD = "+";

const ServerRail = (): ReactNode => (
  <div
    aria-hidden="true"
    className="bg-dc-rail sticky top-0 hidden h-dvh w-18 shrink-0 flex-col items-center gap-2 py-3 md:flex"
  >
    <DiscordMark size="48" className="bg-dc-active fill-dc-bright rounded-2xl p-2.5" />
    <span className="bg-dc-line h-0.5 w-8 rounded-full" />
    <ActiveServer />
    {OTHERS.map((initial) => (
      <span
        key={initial}
        className="bg-dc-sidebar text-dc-text grid size-12 place-items-center rounded-full font-bold"
      >
        {initial}
      </span>
    ))}
    <span className="bg-dc-sidebar text-dc-online grid size-12 place-items-center rounded-full text-2xl">
      {ADD}
    </span>
  </div>
);

export { ServerRail };
