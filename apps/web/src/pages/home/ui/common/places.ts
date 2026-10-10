import type { ChannelKind } from "#/shared/discord";

type Place =
  | Readonly<{ type: "channel"; name: string; kind: ChannelKind }>
  | Readonly<{ type: "thread"; name: string; parent: string }>;

const PLACES = {
  announce: { type: "channel", name: "お知らせ", kind: "announcement" },
  campPlan: { type: "thread", name: "キャンプ計画", parent: "ざつだん" },
  hitori: { type: "channel", name: "ひとりごと", kind: "text" },
  recipe: { type: "channel", name: "レシピ", kind: "forum" },
  photo: { type: "channel", name: "しゃしん", kind: "text" },
  kansou: { type: "channel", name: "かんそう", kind: "text" },
  hansei: { type: "thread", name: "反省会", parent: "かんそう" },
  game: { type: "channel", name: "げーむ部", kind: "text" },
} as const satisfies Readonly<Record<string, Place>>;

type PlaceId = keyof typeof PLACES;

export { PLACES };
export type { Place, PlaceId };
