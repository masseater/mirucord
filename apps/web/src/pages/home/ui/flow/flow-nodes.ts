import { MASCOT_NAME, SERVICE_NAME } from "#/shared/config";

import type { NodeSpec } from "./flow-node";

export const SERVER_NODE: NodeSpec = {
  shape: { height: 160, fill: "fill-lavender", shadow: true, radius: 40 },
  title: { y: 108, tone: "fill-ink text-base font-black", text: "みんなのサーバー" },
  caption: { y: 132, text: `${MASCOT_NAME}を招待するだけ` },
};

export const MIRU_NODE: NodeSpec = {
  shape: { height: 240, fill: "fill-pink", shadow: false, radius: 48 },
  title: { y: 184, tone: "fill-ink text-xl font-black", text: SERVICE_NAME },
  caption: { y: 212, text: "鍵をかけてしまっておく" },
};

export const AI_NODE: NodeSpec = {
  shape: { height: 160, fill: "fill-butter", shadow: true, radius: 40 },
  title: { y: 96, tone: "fill-ink text-4xl font-black", text: "AI" },
  caption: { y: 128, text: "話しかけるだけ" },
};
