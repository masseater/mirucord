import type { ReactNode } from "react";

import { MemoryNode } from "./memory-node";

const TITLE_ID = "problem-diagram-title";
const LABEL = "昔の思い出ほどタイムラインの上に流れて見えなくなっていく図";
const FIRST = "2022 春 はじめまして";
const FIRST_NOTE = "遠すぎて見えない";
const OFFLINE = "2023 冬 はじめてのオフ会";
const OFFLINE_NOTE = "このへんだった気が…";
const CAMP = "2024 夏 キャンプ";
const CAMP_NOTE = "まだぎりぎり見える";
const SCROLL = "スクロールしても";
const SCROLL_TAIL = "とどかない…";
const SAD = "(´・ω・`)";

const ProblemDiagram = (): ReactNode => (
  <svg viewBox="0 0 1000 440" aria-labelledby={TITLE_ID} className="block h-auto w-full min-w-180">
    <title id={TITLE_ID}>{LABEL}</title>
    <path
      d="M190 140 C 190 220, 400 160, 410 262 C 420 340, 620 300, 630 384"
      className="stroke-lavender-deep dash-flow"
      fill="none"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <MemoryNode left="70" top="40" name={FIRST} status={FIRST_NOTE} tone="far" />
    <MemoryNode left="290" top="162" name={OFFLINE} status={OFFLINE_NOTE} tone="middle" />
    <MemoryNode left="510" top="284" name={CAMP} status={CAMP_NOTE} tone="near" />
    <rect
      x="880"
      y="30"
      width="28"
      height="380"
      rx="14"
      className="fill-lavender stroke-ink"
      strokeWidth="3"
    />
    <rect
      x="880"
      y="320"
      width="28"
      height="90"
      rx="14"
      className="fill-lavender-deep stroke-ink"
      strokeWidth="3"
    />
    <path
      d="M860 300 L 860 70"
      className="stroke-pink-deep dash-flow motion-safe:animate-flow"
      fill="none"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <text x="840" y="150" textAnchor="end" className="fill-ink text-lg font-black">
      {SCROLL}
    </text>
    <text x="840" y="180" textAnchor="end" className="fill-ink text-lg font-black">
      {SCROLL_TAIL}
    </text>
    <text x="840" y="220" textAnchor="end" className="fill-grape text-2xl font-black">
      {SAD}
    </text>
  </svg>
);

export { ProblemDiagram };
