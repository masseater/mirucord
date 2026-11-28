import type { Author } from "./author.ts";
import type { Reply } from "./message.tsx";
import type { Reaction } from "./reactions.tsx";

export type ChatLine = Readonly<{
  author: Author;
  text: string;
  reply?: Reply;
  reactions: readonly Reaction[];
}>;
