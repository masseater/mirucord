import { runInDurableObject } from "cloudflare:test";
import { ChannelType } from "discord-api-types/v10";
import { Effect } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import { channel, db } from "#/shared/db/index.server";

import { GUILD_A, seedScenario } from "./scenario";

type SeededThreadMember = readonly [
  threadId: string,
  userId: string,
  joinedAt: number,
  leftAt: number | null,
];

type ThreadSeed = Readonly<{
  thread: Readonly<{ id: string; name: string; parentId: string }>;
  members: readonly SeededThreadMember[];
}>;

const INSERT_MEMBER =
  "INSERT INTO thread_member (threadId, userId, joinedAt, leftAt) VALUES (?, ?, ?, ?)";

const seedThreadScenario = ({ thread, members }: ThreadSeed): Promise<void> =>
  Effect.runPromise(
    Effect.gen(function* seedThread() {
      yield* Effect.promise(seedScenario);
      yield* Effect.promise(() =>
        db.insert(channel).values({
          ...thread,
          guildId: GUILD_A,
          type: ChannelType.PublicThread,
          permissionOverwrites: [],
        }),
      );
      yield* Effect.promise(() =>
        runInDurableObject(guildStore(GUILD_A), (_store, state) => {
          for (const row of members) {
            state.storage.sql.exec(INSERT_MEMBER, ...row);
          }
        }),
      );
    }),
  );

export { seedThreadScenario };
export type { SeededThreadMember, ThreadSeed };
