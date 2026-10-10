const AVATAR_SIZE = {
  md: { frame: "size-10 text-sm", mascot: "size-8" },
  sm: { frame: "size-8 text-xs", mascot: "size-6" },
} as const;

type AvatarSize = keyof typeof AVATAR_SIZE;

export { AVATAR_SIZE };
export type { AvatarSize };
