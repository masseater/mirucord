import { eq } from "drizzle-orm";
import { Effect, Option } from "effect";

import { forumRowOf, ingestOf } from "#/features/ingest/model/channel-ingest";
import type { ChannelIngest, IngestRow } from "#/features/ingest/model/channel-ingest";
import { kindOf, LISTED_TYPES } from "#/features/ingest/model/channel-kind";
import type { ConsentScope } from "#/features/ingest/model/consent-scope";
import { channel, db } from "#/shared/db/index.server";
import { CATEGORY_TYPES } from "#/shared/discord";
import type { ChannelKind } from "#/shared/discord";

import { inDiscordOrder } from "./channel-order";

const UNCATEGORIZED = "";

type SettingsChannel =
  | Readonly<{
      kind: Exclude<ChannelKind, "forum">;
      id: string;
      name: string;
      categoryId: string;
      ingest: ChannelIngest;
    }>
  | Readonly<{
      kind: "forum";
      id: string;
      name: string;
      categoryId: string;
      ingest: ChannelIngest;
      posts: number;
    }>;

type SettingsCategory = Readonly<{ id: string; name: string }>;

type StoredRow = IngestRow &
  Readonly<{ id: string; name: string; type: number; position: number; parentId: string | null }>;

type SettingsChannels = Readonly<{
  categories: readonly SettingsCategory[];
  channels: readonly SettingsChannel[];
}>;

const settingsChannelOf = (
  scope: ConsentScope,
  row: StoredRow,
  rows: readonly StoredRow[],
): SettingsChannel => {
  const kind = kindOf(row.type);
  const base = {
    id: row.id,
    name: row.name,
    categoryId: Option.getOrElse(Option.fromNullOr(row.parentId), () => UNCATEGORIZED),
  };
  if (kind !== "forum") {
    return { ...base, kind, ingest: ingestOf(scope, row) };
  }
  const posts = rows.filter(({ parentId }) => parentId === row.id);
  return {
    ...base,
    kind,
    ingest: ingestOf(scope, forumRowOf(row, posts)),
    posts: posts.length,
  };
};

const loadChannels = ({
  guildId,
  scope,
}: Readonly<{ guildId: string; scope: ConsentScope }>): Effect.Effect<SettingsChannels> =>
  Effect.promise(() =>
    db
      .select({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        position: channel.position,
        parentId: channel.parentId,
        newest: channel.newestMessageId,
        backfill: channel.backfill,
        botAccess: channel.botAccess,
      })
      .from(channel)
      .where(eq(channel.guildId, guildId)),
  ).pipe(
    Effect.map((rows) => ({
      categories: inDiscordOrder(rows.filter(({ type }) => CATEGORY_TYPES.has(type))).map(
        ({ id, name }) => ({ id, name }),
      ),
      channels: inDiscordOrder(rows.filter(({ type }) => LISTED_TYPES.has(type))).map((row) =>
        settingsChannelOf(scope, row, rows),
      ),
    })),
  );

export { loadChannels };
export type { SettingsCategory, SettingsChannel, SettingsChannels };
