import type {
  ReactionsJob,
  ScheduledEventsJob,
  VoiceJob,
  VoiceSnapshotJob,
} from "@repo/ingest-util-gateway-contract";
import { Effect } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";

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

export { storeGatewayReactions, storeGatewayVoice, storeScheduledEvents, storeVoiceSnapshot };
