import { queryOptions } from "@tanstack/react-query";
import type { DataTag, UnusedSkipTokenOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { Duration, Effect, Option, Schema } from "effect";

import type {
  ConsentResult,
  ForumPostsResult,
  GuildIngest,
  PurgeResult,
  RevokeResult,
} from "#/features/ingest/index.server";

import {
  consentTo,
  disconnectFor,
  eraseMessagesFor,
  loadDashboard,
  loadForumPosts,
  loadGuildPage,
  purgeFor,
  revokeFor,
} from "./dashboard.server";
import type {
  ChannelTarget,
  ConsentInput,
  Dashboard,
  DisconnectResult,
  EraseResult,
  GuildPage,
  SignedOut,
} from "./dashboard.server";

type GuildPageKey = readonly ["dashboard", string];

type ForumPostsKey = readonly ["dashboard", string, "forum", string];

const BUSY_POLL_SECONDS = 5;
const BUSY_POLL = Duration.seconds(BUSY_POLL_SECONDS);
const BUSY: ReadonlySet<GuildIngest> = new Set(["withdrawing", "waiting", "backfilling"]);

const pollWhileBusy = (dashboard: Option.Option<Dashboard>): number | false =>
  dashboard.pipe(
    Option.filter(
      (loaded) => loaded.status === "ready" && loaded.guilds.some(({ ingest }) => BUSY.has(ingest)),
    ),
    Option.match({ onNone: () => false, onSome: () => Duration.toMillis(BUSY_POLL) }),
  );

const GuildInput = Schema.Struct({ guildId: Schema.String });

const AppInput = Schema.Struct({ clientId: Schema.String });

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

const getForumPosts = createServerFn({ method: "GET" })
  .validator(Schema.toStandardSchemaV1(ChannelInput))
  .handler(({ data }) => Effect.runPromise(loadForumPosts(data)));

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
  refetchInterval: ({ state }) => pollWhileBusy(Option.fromUndefinedOr(state.data)),
});

const guildPageQuery = (
  guildId: string,
): UnusedSkipTokenOptions<GuildPage, Error, GuildPage, GuildPageKey> &
  Readonly<{ queryKey: DataTag<GuildPageKey, GuildPage, Error> }> =>
  queryOptions({
    queryKey: ["dashboard", guildId] as const,
    queryFn: () => getGuildPage({ data: { guildId } }),
  });

type ForumPostsOutcome = ForumPostsResult | SignedOut;

const forumPostsQuery = ({
  guildId,
  channelId,
}: ChannelTarget): UnusedSkipTokenOptions<
  ForumPostsOutcome,
  Error,
  ForumPostsOutcome,
  ForumPostsKey
> &
  Readonly<{ queryKey: DataTag<ForumPostsKey, ForumPostsOutcome, Error> }> =>
  queryOptions({
    queryKey: ["dashboard", guildId, "forum", channelId] as const,
    queryFn: () => getForumPosts({ data: { guildId, channelId } }),
  });

const saveConsent = (input: ConsentInput): Promise<ConsentResult | SignedOut> =>
  postConsent({ data: input });

const withdrawConsent = (guildId: string): Promise<RevokeResult | SignedOut> =>
  postRevoke({ data: { guildId } });

const postDisconnect = createServerFn({ method: "POST" })
  .validator(Schema.toStandardSchemaV1(AppInput))
  .handler(({ data }) => Effect.runPromise(disconnectFor(data.clientId)));

const disconnectConnectedApp = (clientId: string): Promise<DisconnectResult> =>
  postDisconnect({ data: { clientId } });

const postEraseMessages = createServerFn({ method: "POST" })
  .validator(Schema.toStandardSchemaV1(GuildInput))
  .handler(({ data }) => Effect.runPromise(eraseMessagesFor(data.guildId)));

const eraseMyMessages = (guildId: string): Promise<EraseResult | SignedOut> =>
  postEraseMessages({ data: { guildId } });

const purgeStoredChannel = (input: typeof ChannelInput.Type): Promise<PurgeResult | SignedOut> =>
  postPurge({ data: input });

export type { ForumPostsOutcome };
export {
  dashboardQuery,
  disconnectConnectedApp,
  eraseMyMessages,
  forumPostsQuery,
  guildPageQuery,
  purgeStoredChannel,
  saveConsent,
  withdrawConsent,
};
