import { SELF_HOST_PATH, TECH_PATH } from "#/shared/config";

const GUIDE_CHANNELS = [
  { href: TECH_PATH, name: "技術の話", kind: "text" },
  { href: SELF_HOST_PATH, name: "セルフホスト", kind: "text" },
] as const;

export { GUIDE_CHANNELS };
