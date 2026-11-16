import type { Member } from "#/pages/home/ui/common/members";

export type Author = Readonly<{ kind: "bot" }> | Readonly<{ kind: "member"; member: Member }>;

export const BOT: Author = { kind: "bot" };

export const memberAuthor = (member: Member): Author => ({ kind: "member", member });
