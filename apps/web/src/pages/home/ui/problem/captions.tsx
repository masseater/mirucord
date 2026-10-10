import type { ReactNode } from "react";

import { GatherCard } from "./gather-card";

const CAPTIONS = [
  "あのキャンプの話 どこだっけ…",
  "チャンネルにスレッドに DM 思い出はあちこちにバラバラ",
  "検索しても 1,284 件 追いかけきれない…",
] as const;

const Captions = (): ReactNode => (
  <div className="scene-captions">
    {CAPTIONS.map((caption) => (
      <p
        key={caption}
        className="scene-caption bg-dc-rail text-dc-bright font-maru rounded-lg px-5 py-4 text-xl leading-snug font-black md:text-2xl"
      >
        {caption}
      </p>
    ))}
    <GatherCard />
  </div>
);

export { Captions };
