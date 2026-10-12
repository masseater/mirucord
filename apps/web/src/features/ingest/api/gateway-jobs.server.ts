import { Effect, Option, pipe } from "effect";

import type { ForgetJob, RefreshJob, StoreJob } from "#/features/ingest/model/ingest-job";
import { openGuildKeys } from "#/shared/crypto/index.server";
import { FORBIDDEN, NOT_FOUND, findMessage, listMessages } from "#/shared/discord/index.server";
import type { DiscordMessage } from "#/shared/discord/index.server";

import { loadChannelKey } from "./ingest-channel.server";
import { oldestId, storeConsented } from "./message-page.server";
import type { IngestError } from "./message-page.server";
import { deleteMessages, storedInChannel } from "./message-rows.server";
import type { ChannelRef } from "./message-rows.server";

const SNOWFLAKE_STEP = 1n;
const LISTED_LOOKUP_MIN = 2;

type Lookup = Readonly<{ id: string; found: Option.Option<DiscordMessage> }>;

const forgetIn = (ref: ChannelRef, ids: readonly string[]): Effect.Effect<void> =>
  storedInChannel({ ...ref, ids }).pipe(
    Effect.flatMap((stored) => deleteMessages({ guildId: ref.guildId, ids: stored })),
  );

const forgetMessages = (job: ForgetJob): Effect.Effect<void> => forgetIn(job, job.messageIds);

const lookUpEach = (
  channelId: string,
  ids: readonly string[],
): Effect.Effect<readonly Lookup[], IngestError> =>
  pipe(
    ids,
    Effect.forEach((id) => findMessage(channelId, id).pipe(Effect.map((found) => ({ id, found })))),
  );

const pageFrom = (
  channelId: string,
  oldest: string,
): Effect.Effect<readonly DiscordMessage[], IngestError> =>
  listMessages(channelId, {
    direction: "after",
    cursor: String(BigInt(oldest) - SNOWFLAKE_STEP),
  }).pipe(
    Effect.catchIf(
      (failure) => Option.contains(failure.status, NOT_FOUND),
      () => Effect.succeed([]),
    ),
  );

const lookUpInPage = (
  job: RefreshJob,
  oldest: string,
): Effect.Effect<readonly Lookup[], IngestError> =>
  pageFrom(job.channelId, oldest).pipe(
    Effect.flatMap((page) => {
      const listed = new Set(page.map(({ id }) => id));
      const wanted = new Set(job.messageIds);
      const missing = job.messageIds.filter((id) => !listed.has(id));
      return lookUpEach(job.channelId, missing).pipe(
        Effect.map((fetched) => [
          ...page
            .filter(({ id }) => wanted.has(id))
            .map((found) => ({ id: found.id, found: Option.some(found) })),
          ...fetched,
        ]),
      );
    }),
  );

const lookUp = (job: RefreshJob): Effect.Effect<readonly Lookup[], IngestError> =>
  Option.match(
    oldestId(job.messageIds).pipe(Option.filter(() => job.messageIds.length >= LISTED_LOOKUP_MIN)),
    {
      onNone: () => lookUpEach(job.channelId, job.messageIds),
      onSome: (oldest) => lookUpInPage(job, oldest),
    },
  );

const refreshWith = (job: RefreshJob, wrappedKey: string): Effect.Effect<void, IngestError> =>
  Effect.gen(function* refresh() {
    const keys = yield* openGuildKeys(wrappedKey);
    const lookups = yield* lookUp(job);
    const page = lookups.flatMap(({ found }) => Option.toArray(found));
    const gone = lookups.filter(({ found }) => Option.isNone(found)).map(({ id }) => id);
    yield* storeConsented({
      ...keys,
      job: { guildId: job.guildId, channelId: job.channelId },
      page,
    });
    yield* forgetIn(job, gone);
  });

const refreshMessages = (job: RefreshJob): Effect.Effect<void, IngestError> =>
  loadChannelKey(job).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.void,
        onSome: (wrappedKey) => refreshWith(job, wrappedKey),
      }),
    ),
    Effect.catchTag("DiscordRequestError", (failure) => {
      if (Option.contains(failure.status, FORBIDDEN)) {
        return Effect.void;
      }
      return Effect.fail(failure);
    }),
  );

const storeWith = (job: StoreJob, wrappedKey: string): Effect.Effect<void> =>
  openGuildKeys(wrappedKey).pipe(
    Effect.flatMap((keys) =>
      storeConsented({
        ...keys,
        job: { guildId: job.guildId, channelId: job.channelId },
        page: job.messages,
      }),
    ),
  );

const storeGatewayMessages = (job: StoreJob): Effect.Effect<void> =>
  loadChannelKey(job).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.void,
        onSome: (wrappedKey) => storeWith(job, wrappedKey),
      }),
    ),
  );

export { forgetMessages, refreshMessages, storeGatewayMessages };
