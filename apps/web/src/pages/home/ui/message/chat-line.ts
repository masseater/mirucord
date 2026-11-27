import type { Author } from "./author";
import type { Reply } from "./message";
import type { Reaction } from "./reactions";

export type ChatLine = Readonly<{
  author: Author;
  text: string;
  reply?: Reply;
  reactions: readonly Reaction[];
}>;
