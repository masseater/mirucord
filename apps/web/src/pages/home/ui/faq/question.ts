import type { Reply } from "#/pages/home/ui/message/message";
import type { Reaction } from "#/pages/home/ui/message/reactions";

export type Question = Readonly<{
  time: string;
  answer: string;
  copy?: string | undefined;
  reply: Reply;
  reactions: readonly Reaction[];
}>;
