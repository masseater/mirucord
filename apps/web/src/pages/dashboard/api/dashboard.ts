import { queryOptions } from "@tanstack/react-query";
import type { DataTag, UnusedSkipTokenOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";

import type { ConsentResult, PurgeResult, RevokeResult } from "#/features/ingest/index.server";

import { consentTo, loadDashboard, loadGuildPage, purgeFor, revokeFor } from "./dashboard.server";
import type { ConsentInput, GuildPage, SignedOut } from "./dashboard.server";

type GuildPageKey = readonly ["dashboard", string];

const GuildInput = Schema.Struct({ guildId: Schema.String });

const ChannelInput = Schema.Struct({ guildId: Schema.String, channelId: Schema.String });

const ConsentInputSchema = Schema.Struct({
  guildId: Schema.String,
  noticeChannelId: Schema.String,
});

const getDashboard = createServerFn({ method: "GET" }).handler(() =>
  Effect.runPromise(loadDashboard),
);

const getGuildPage = createServerFn({ method: "GET" })
  .validator(Schema.toStandardSchemaV1(GuildInput))
  .handler(({ data }) => Effect.runPromise(loadGuildPage(data.guildId)));

const postConsent = createServerFn({ method: "POST" })
  .validator(Schema.toStandardSchemaV1(ConsentInputSchema))
  .handler(({ data }) => Effect.runPromise(consentTo(data)));

const postRevoke = createServerFn({ method: "POST" })
  .validator(Schema.toStandardSchemaV1(GuildInput))
  .handler(({ data }) => Effect.runPromise(revokeFor(data.guildId)));

const postPurge = createServerFn({ method: "POST" })
  .validator(Schema.toStandardSchemaV1(ChannelInput))
  .handler(({ data }) => Effect.runPromise(purgeFor(data)));

const dashboardQuery = queryOptions({
  queryKey: ["dashboard"],
  queryFn: () => getDashboard(),
});

const guildPageQuery = (
  guildId: string,
): UnusedSkipTokenOptions<GuildPage, Error, GuildPage, GuildPageKey> &
  Readonly<{ queryKey: DataTag<GuildPageKey, GuildPage, Error> }> =>
  queryOptions({
    queryKey: ["dashboard", guildId] as const,
    queryFn: () => getGuildPage({ data: { guildId } }),
  });

const saveConsent = (input: ConsentInput): Promise<ConsentResult | SignedOut> =>
  postConsent({ data: input });

const withdrawConsent = (guildId: string): Promise<RevokeResult | SignedOut> =>
  postRevoke({ data: { guildId } });

const purgeStoredChannel = (input: typeof ChannelInput.Type): Promise<PurgeResult | SignedOut> =>
  postPurge({ data: input });

export { dashboardQuery, guildPageQuery, purgeStoredChannel, saveConsent, withdrawConsent };
