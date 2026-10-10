const MEMBERS = {
  yui: { initial: "ゆ", avatar: "bg-pink-deep", name: "ゆい", tone: "text-pink-deep" },
  kenta: { initial: "け", avatar: "bg-mint", name: "kenta", tone: "text-mint" },
  tanaka: { initial: "た", avatar: "bg-sky-deep", name: "たなか", tone: "text-sky-deep" },
  miho: { initial: "み", avatar: "bg-butter-deep", name: "みほ", tone: "text-butter-deep" },
} as const;

type Member = (typeof MEMBERS)[keyof typeof MEMBERS];

export { MEMBERS };
export type { Member };
