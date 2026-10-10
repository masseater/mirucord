import type { ReactNode } from "react";

import { GatherCard } from "./gather-card";

const CAPTIONS = [
  ["あのキャンプの話", "どこだっけ…"],
  ["チャンネルに スレッドに フォーラム", "思い出はあちこちにバラバラ"],
  ["検索しても 1,284 件", "追いかけきれない…"],
] as const;

const Captions = (): ReactNode => (
  <div className="scene-captions">
    {CAPTIONS.map((lines) => (
      <p
        key={lines.join("")}
        className="scene-caption bg-dc-rail text-dc-bright font-maru grid rounded-lg px-4 py-4 text-base leading-snug font-black sm:text-lg md:text-2xl"
      >
        {lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </p>
    ))}
    <GatherCard />
  </div>
);

export { Captions };
