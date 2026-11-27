import type { ReactionsJob, VoiceJob, VoiceSnapshotJob } from "@repo/ingest-util-gateway-contract";
import { Effect } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";

import { whenConsented } from "./consented.server";

const logged = ({
  guildId,
  label,
  counts,
}: Readonly<{
  guildId: string;
  label: string;
  counts: Readonly<Record<string, number>>;
}>): Effect.Effect<void> => Effect.logInfo(label).pipe(Effect.annotateLogs({ guildId, ...counts }));

const storeActivity = ({
  guildId,
  label,
  counts,
  save,
}: Readonly<{
  guildId: string;
  label: string;
  counts: Readonly<Record<string, number>>;
  save: () => Promise<unknown>;
}>): Effect.Effect<void> =>
  whenConsented(guildId)(() =>
    Effect.promise(save).pipe(Effect.andThen(logged({ guildId, label, counts }))),
  );

export const storeGatewayVoice = ({ guildId, changes }: VoiceJob): Effect.Effect<void> =>
  storeActivity({
    guildId,
    label: "Voice changes stored",
    counts: { changes: changes.length },
    save: () => guildStore(guildId).saveVoiceChanges(changes),
  });

export const storeVoiceSnapshot = ({
  guildId,
  at,
  present,
}: VoiceSnapshotJob): Effect.Effect<void> =>
  storeActivity({
    guildId,
    label: "Voice snapshot stored",
    counts: { present: present.length },
    save: () => guildStore(guildId).saveVoiceSnapshot({ at, present }),
  });

export const storeGatewayReactions = ({ guildId, changes }: ReactionsJob): Effect.Effect<void> =>
  storeActivity({
    guildId,
    label: "Reactions stored",
    counts: { changes: changes.length },
    save: () => guildStore(guildId).saveReactions(changes),
  });
