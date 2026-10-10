import type { Reply } from "#/pages/home/ui/message/message";
import type { Reaction } from "#/pages/home/ui/message/reactions";

type Question = Readonly<{
  time: string;
  answer: string;
  reply: Reply;
  reactions: readonly Reaction[];
}>;

export type { Question };
