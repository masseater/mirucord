import { useId } from "react";
import type { ReactNode } from "react";

import { AiNode } from "./ai-node";
import { FlowCarry } from "./flow-carry";
import { MiruNode } from "./miru-node";
import { ServerNode } from "./server-node";

const LABEL = "みんなのサーバーの会話をミルが預かって AI に届ける図";
const PROTOCOL = "MCP";
const AI_CAPTION = "話しかけるだけ";

const LAYOUTS = {
  row: {
    viewBox: "0 0 1000 320",
    className: "flow-row hidden @2xl:block",
    server: { left: "20", top: "76" },
    miru: { left: "385", top: "38" },
    ai: { left: "750", top: "76" },
    links: ["M250 160 L 385 160", "M615 160 L 750 160"],
    protocol: { left: "682", top: "142", anchor: "middle" },
    carry: { first: { left: "236", top: "148" }, second: { left: "601", top: "148" } },
  },
  column: {
    viewBox: "0 0 340 796",
    className: "flow-column mx-auto max-w-xs @2xl:hidden",
    server: { left: "55", top: "20" },
    miru: { left: "55", top: "278" },
    ai: { left: "55", top: "608" },
    links: ["M170 188 L 170 278", "M170 518 L 170 608"],
    protocol: { left: "186", top: "568", anchor: "start" },
    carry: { first: { left: "156", top: "176" }, second: { left: "156", top: "506" } },
  },
} as const;

const FlowDiagram = ({ layout }: Readonly<{ layout: keyof typeof LAYOUTS }>): ReactNode => {
  const titleId = useId();
  const { viewBox, className, server, miru, ai, links, protocol, carry } = LAYOUTS[layout];
  return (
    <svg viewBox={viewBox} aria-labelledby={titleId} className={`block h-auto w-full ${className}`}>
      <title id={titleId}>{LABEL}</title>
      {links.map((path) => (
        <path
          key={path}
          d={path}
          className="stroke-lavender-deep dash-flow motion-safe:animate-flow"
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
        />
      ))}
      <FlowCarry starts={carry} />
      <ServerNode left={server.left} top={server.top} />
      <MiruNode left={miru.left} top={miru.top} />
      <text
        x={protocol.left}
        y={protocol.top}
        textAnchor={protocol.anchor}
        className="fill-ink-soft text-sm font-black"
      >
        {PROTOCOL}
      </text>
      <AiNode left={ai.left} top={ai.top} caption={AI_CAPTION} />
    </svg>
  );
};

export { FlowDiagram };
