import { Effect, Option } from "effect";

import type { ForgetJob, RefreshJob } from "#/features/ingest/model/ingest-job";
import { openGuildKey } from "#/shared/crypto/index.server";
import { FORBIDDEN, findMessage } from "#/shared/discord/index.server";
import type { DiscordMessage } from "#/shared/discord/index.server";

import { loadChannelKey } from "./ingest-channel.server";
import { storeConsented } from "./message-page.server";
import type { IngestError } from "./message-page.server";
import { deleteMessages, storedInChannel } from "./message-rows.server";
import type { VectorizeError } from "./message-rows.server";

type Lookup = Readonly<{ id: string; found: Option.Option<DiscordMessage> }>;

const forgetIn = (channelId: string, ids: readonly string[]): Effect.Effect<void, VectorizeError> =>
  storedInChannel({ channelId, ids }).pipe(Effect.flatMap(deleteMessages));

const forgetMessages = (job: ForgetJob): Effect.Effect<void, VectorizeError> =>
  forgetIn(job.channelId, job.messageIds);

const lookUp = (job: RefreshJob): Effect.Effect<readonly Lookup[], IngestError> =>
  Effect.all(
    job.messageIds.map((id) =>
      findMessage(job.channelId, id).pipe(Effect.map((found) => ({ id, found }))),
    ),
  );

const refreshWith = (job: RefreshJob, wrappedKey: string): Effect.Effect<void, IngestError> =>
  Effect.gen(function* refresh() {
    const key = yield* openGuildKey(wrappedKey);
    const lookups = yield* lookUp(job);
    const page = lookups.flatMap(({ found }) => Option.toArray(found));
    const gone = lookups.filter(({ found }) => Option.isNone(found)).map(({ id }) => id);
    yield* storeConsented({
      key,
      job: { guildId: job.guildId, channelId: job.channelId },
      page,
    });
    yield* forgetIn(job.channelId, gone);
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

export { forgetMessages, refreshMessages };
