import type {
  AuditLogEntry,
  AuditLogJob,
  ReactionsJob,
  ScheduledEventsJob,
  ThreadMembersJob,
  VoiceJob,
  VoiceSnapshotJob,
} from "@repo/ingest-util-gateway-contract";
import { Effect, pipe } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import type { StoredAuditEntry } from "#/entities/guild-message/index.server";
import { openGuildKey, sealAudit } from "#/shared/crypto/index.server";

import { whenConsented } from "./consented.server";

const storeGatewayVoice = ({ guildId, changes }: VoiceJob): Effect.Effect<void> => {
  const logged = Effect.logInfo("Voice changes stored").pipe(
    Effect.annotateLogs({ guildId, changes: changes.length }),
  );
  return whenConsented(guildId)(() =>
    Effect.promise(() => guildStore(guildId).saveVoiceChanges(changes)).pipe(
      Effect.andThen(logged),
    ),
  );
};

const storeVoiceSnapshot = ({ guildId, at, present }: VoiceSnapshotJob): Effect.Effect<void> => {
  const logged = Effect.logInfo("Voice snapshot stored").pipe(
    Effect.annotateLogs({ guildId, present: present.length }),
  );
  return whenConsented(guildId)(() =>
    Effect.promise(() => guildStore(guildId).saveVoiceSnapshot({ at, present })).pipe(
      Effect.andThen(logged),
    ),
  );
};

const storeGatewayReactions = ({ guildId, changes }: ReactionsJob): Effect.Effect<void> => {
  const logged = Effect.logInfo("Reactions stored").pipe(
    Effect.annotateLogs({ guildId, changes: changes.length }),
  );
  return whenConsented(guildId)(() =>
    Effect.promise(() => guildStore(guildId).saveReactions(changes)).pipe(Effect.andThen(logged)),
  );
};

const storeScheduledEvents = ({ guildId, changes }: ScheduledEventsJob): Effect.Effect<void> => {
  const logged = Effect.logInfo("Scheduled events stored").pipe(
    Effect.annotateLogs({ guildId, changes: changes.length }),
  );
  return whenConsented(guildId)(() =>
    Effect.promise(() => guildStore(guildId).saveScheduledEvents(changes)).pipe(
      Effect.andThen(logged),
    ),
  );
};

const storeThreadMembers = ({ guildId, changes }: ThreadMembersJob): Effect.Effect<void> => {
  const logged = Effect.logInfo("Thread members stored").pipe(
    Effect.annotateLogs({ guildId, changes: changes.length }),
  );
  return whenConsented(guildId)(() =>
    Effect.promise(() => guildStore(guildId).saveThreadMembers(changes)).pipe(
      Effect.andThen(logged),
    ),
  );
};

const sealedOf =
  (guildId: string, key: CryptoKey) =>
  ({ entryId, detail, ...fields }: AuditLogEntry): Effect.Effect<StoredAuditEntry> =>
    sealAudit({ key, address: { guildId, entryId } })(detail).pipe(
      Effect.map((sealed) => ({ id: entryId, ...fields, sealed })),
    );

const storeAuditLog = ({ guildId, changes }: AuditLogJob): Effect.Effect<void> =>
  whenConsented(guildId)((wrappedKey) =>
    Effect.gen(function* save() {
      const key = yield* openGuildKey(wrappedKey);
      const entries = yield* pipe(changes, Effect.forEach(sealedOf(guildId, key)));
      yield* Effect.promise(() => guildStore(guildId).saveAuditEntries(entries));
      yield* Effect.logInfo("Audit log stored").pipe(
        Effect.annotateLogs({ guildId, entries: entries.length }),
      );
    }),
  );

export {
  storeAuditLog,
  storeGatewayReactions,
  storeGatewayVoice,
  storeScheduledEvents,
  storeThreadMembers,
  storeVoiceSnapshot,
};
