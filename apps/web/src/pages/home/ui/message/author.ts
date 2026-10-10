import type { Member } from "#/pages/home/ui/client/members";

type Author = Readonly<{ kind: "bot" }> | Readonly<{ kind: "member"; member: Member }>;

const BOT: Author = { kind: "bot" };

const memberAuthor = (member: Member): Author => ({ kind: "member", member });

export { BOT, memberAuthor };
export type { Author };
