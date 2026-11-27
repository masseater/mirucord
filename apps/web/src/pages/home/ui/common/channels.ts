import type { ChannelKind } from "#/shared/discord";

export type Channel = Readonly<{ id: string; name: string; kind: ChannelKind; topic: string }>;

export const TOP_CHANNEL: Channel = {
  id: "top",
  name: "ざつだん",
  kind: "text",
  topic: "Discord の思い出さがし",
};
export const WHY_CHANNEL: Channel = { id: "why", name: "思い出", kind: "text", topic: "" };
export const FORUM_CHANNEL: Channel = { id: "forum", name: "キャンプ部", kind: "forum", topic: "" };
export const HOW_CHANNEL: Channel = { id: "how", name: "しくみ", kind: "text", topic: "" };
export const FEATURES_CHANNEL: Channel = {
  id: "features",
  name: "とくちょう",
  kind: "text",
  topic: "",
};
export const START_CHANNEL: Channel = { id: "start", name: "はじめかた", kind: "text", topic: "" };
export const SAFETY_CHANNEL: Channel = { id: "safety", name: "あんしん", kind: "text", topic: "" };
export const FAQ_CHANNEL: Channel = { id: "faq", name: "よくある質問", kind: "text", topic: "" };

export const CHANNELS: readonly Channel[] = [
  TOP_CHANNEL,
  WHY_CHANNEL,
  FORUM_CHANNEL,
  HOW_CHANNEL,
  FEATURES_CHANNEL,
  START_CHANNEL,
  SAFETY_CHANNEL,
  FAQ_CHANNEL,
];
