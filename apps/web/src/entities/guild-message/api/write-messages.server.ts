import { Array, Effect } from "effect";

import type { IndexedMessage, WriteMode } from "#/entities/guild-message/model/stored-message";

import { guildStore } from "./guild-stub.server";

const WRITE_CHUNK = 20;

type GuildWrite = Readonly<{
  guildId: string;
  messages: readonly IndexedMessage[];
  mode: WriteMode;
}>;

const writeMessages = ({ guildId, messages, mode }: GuildWrite): Effect.Effect<void> =>
  Effect.forEach(
    Array.chunksOf(messages, WRITE_CHUNK),
    (chunk) => Effect.promise(() => guildStore(guildId).write(chunk, mode)),
    { discard: true },
  );

export { writeMessages };
export type { GuildWrite };
