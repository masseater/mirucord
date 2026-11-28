import { Array, DateTime, Effect, Option, pipe, Record, String } from "effect";

import { openGuildKey, openMessage } from "#/shared/crypto/index.server";
import type { MessageBody } from "#/shared/crypto/index.server";

import { guildStore } from "./store-stub.server.ts";
import type { SealedMessage } from "./store-types.ts";

export type MessageScope = Readonly<{
  guild: Readonly<{ guildId: string; wrappedKey: string; consent: string }>;
  visible: readonly string[];
}>;

export type MentionView = Readonly<{ id: string; name: string | null }>;

export type MessageView = Readonly<{
  id: string;
  channelId: string;
  author: string;
  authorId: string;
  mentions: readonly MentionView[];
  replyTo: string | null;
  content: string;
  attachments: MessageBody["attachments"];
  embeds: MessageBody["embeds"];
  stickers: MessageBody["stickers"];
  poll: MessageBody["poll"];
  createdAt: string;
  edited: boolean;
  url: string;
}>;

const holdsMessage = (scope: MessageScope, { channelId }: SealedMessage): boolean =>
  scope.guild.consent === "consented" && scope.visible.includes(channelId);

const USER_MENTION = /<@!?(?<id>\d+)>/gu;

const mentionsOf = ({ content, mentions }: MessageBody): readonly MentionView[] => {
  const names = new Map(
    pipe(
      mentions,
      Array.map(({ id, name }) => [id, name] as const),
    ),
  );
  const written = pipe(
    Array.fromIterable(String.matchAll(USER_MENTION)(content)),
    Array.flatMap(({ groups }) =>
      pipe(Option.fromUndefinedOr(groups), Option.flatMap(Record.get("id")), Option.toArray),
    ),
  );
  const ids = Array.dedupe([...written, ...names.keys()]);
  return pipe(
    ids,
    Array.map((id) => ({ id, name: Option.getOrNull(Option.fromUndefinedOr(names.get(id))) })),
  );
};

type Opened = Readonly<{ row: SealedMessage; body: MessageBody; authorId: string }>;

const viewOf = (guildId: string, { row, body, authorId }: Opened): MessageView => ({
  id: row.id,
  channelId: row.channelId,
  author: body.authorName,
  authorId,
  mentions: mentionsOf(body),
  replyTo: Option.getOrNull(Option.fromUndefinedOr(body.replyTo)),
  content: body.content,
  attachments: body.attachments,
  embeds: body.embeds,
  stickers: body.stickers,
  poll: body.poll,
  createdAt: DateTime.formatIso(DateTime.makeUnsafe(row.createdAt)),
  edited: Option.isSome(Option.fromNullOr(row.editedAt)),
  url: `https://discord.com/channels/${guildId}/${row.channelId}/${row.id}`,
});

const authorsOf = (
  guildId: string,
  rows: readonly SealedMessage[],
): Effect.Effect<Record.ReadonlyRecord<string, string>> =>
  Effect.promise(() =>
    guildStore(guildId).authors(
      pipe(
        rows,
        Array.map(({ id }) => id),
      ),
    ),
  ).pipe(
    Effect.map((authored) =>
      Record.fromEntries(
        pipe(
          authored,
          Array.map(({ id, authorId }) => [id, authorId] as const),
        ),
      ),
    ),
  );

const attributed = (
  row: SealedMessage,
  authors: Record.ReadonlyRecord<string, string>,
): readonly Readonly<{ row: SealedMessage; authorId: string }>[] =>
  pipe(
    Record.get(authors, row.id),
    Option.map((authorId) => ({ row, authorId })),
    Option.toArray,
  );

export const openStored = ({
  scope,
  stored,
}: Readonly<{
  scope: MessageScope;
  stored: readonly SealedMessage[];
}>): Effect.Effect<readonly MessageView[]> => {
  const { guildId, wrappedKey } = scope.guild;
  const held = pipe(
    stored,
    Array.filter((row) => holdsMessage(scope, row)),
  );
  if (Array.isReadonlyArrayEmpty(held)) {
    return Effect.succeed([]);
  }
  return Effect.all(
    {
      key: openGuildKey(wrappedKey),
      authors: authorsOf(guildId, held),
    },
    { concurrency: 1 },
  ).pipe(
    Effect.flatMap(({ key, authors }) =>
      Effect.forEach(
        pipe(
          held,
          Array.flatMap((row) => attributed(row, authors)),
        ),
        ({ row, authorId }) =>
          openMessage(row.sealed, key, {
            guildId,
            channelId: row.channelId,
            messageId: row.id,
          }).pipe(Effect.map((body) => viewOf(guildId, { row, body, authorId }))),
        { concurrency: 1 },
      ),
    ),
  );
};
