const TOP_CHANNEL = {
  id: "top",
  name: "ざつだん",
  kind: "text",
  topic: "Discord の思い出さがし",
} as const;

const CHANNELS = [
  TOP_CHANNEL,
  { id: "why", name: "思い出", kind: "text", topic: "" },
  { id: "forum", name: "キャンプ部", kind: "forum", topic: "" },
  { id: "how", name: "しくみ", kind: "text", topic: "" },
  { id: "features", name: "とくちょう", kind: "text", topic: "" },
  { id: "start", name: "はじめかた", kind: "text", topic: "" },
  { id: "safety", name: "あんしん", kind: "text", topic: "" },
  { id: "faq", name: "よくある質問", kind: "text", topic: "" },
] as const;

export { CHANNELS, TOP_CHANNEL };
