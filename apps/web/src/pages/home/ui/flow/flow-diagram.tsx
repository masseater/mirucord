import { Array, pipe } from "effect";
import { useId } from "react";
import type { ReactNode } from "react";
import { siClaude, siDiscord } from "simple-icons";

import { BrandMark } from "#/pages/home/ui/common/brand-mark";
import { mascotSrc } from "#/shared/brand";
import { MASCOT_NAME } from "#/shared/config";

import { FlowCarry } from "./flow-carry.tsx";
import { FlowNode } from "./flow-node.tsx";
import { AI_NODE, MIRU_NODE, SERVER_NODE } from "./flow-nodes.ts";

const LABEL = `みんなのサーバーの会話を${MASCOT_NAME}が預かって AI に届ける図`;
const PROTOCOL = "MCP";

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

export const FlowDiagram = ({ layout }: Readonly<{ layout: keyof typeof LAYOUTS }>): ReactNode => {
  const titleId = useId();
  const { viewBox, className, server, miru, ai, links, protocol, carry } = LAYOUTS[layout];
  return (
    <svg viewBox={viewBox} aria-labelledby={titleId} className={`block h-auto w-full ${className}`}>
      <title id={titleId}>{LABEL}</title>
      {pipe(
        links,
        Array.map((path) => (
          <path
            key={path}
            d={path}
            className="stroke-lavender-deep dash-flow motion-safe:animate-flow"
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
          />
        )),
      )}
      <FlowCarry starts={carry} />
      <FlowNode left={server.left} top={server.top} node={SERVER_NODE}>
        <BrandMark path={siDiscord.path} left="91" top="26" size="48" className="fill-discord" />
      </FlowNode>
      <FlowNode left={miru.left} top={miru.top} node={MIRU_NODE}>
        <image
          href={mascotSrc}
          x="55"
          y="20"
          width="120"
          height="120"
          aria-hidden="true"
          className="motion-safe:animate-wiggle origin-fill"
        />
      </FlowNode>
      <text
        x={protocol.left}
        y={protocol.top}
        textAnchor={protocol.anchor}
        className="fill-ink-soft text-sm font-black"
      >
        {PROTOCOL}
      </text>
      <FlowNode left={ai.left} top={ai.top} node={AI_NODE}>
        <BrandMark path={siClaude.path} left="103" top="24" size="24" className="fill-claude" />
      </FlowNode>
    </svg>
  );
};
