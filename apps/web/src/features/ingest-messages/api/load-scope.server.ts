import { Effect } from "effect";

import { loadConsentDetail } from "#/entities/scope/index.server";
import { SCOPE_OF_CONSENT } from "#/features/ingest-messages/model/channel-ingest";
import type { ConsentScope } from "#/features/ingest-messages/model/consent-scope";

export const loadScope = (guildId: string): Effect.Effect<ConsentScope> =>
  loadConsentDetail(guildId).pipe(Effect.map(({ status }) => SCOPE_OF_CONSENT[status]));
