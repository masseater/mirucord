import { MessageType } from "discord-api-types/v10";
import { Array, DateTime, Effect, Equal, Option, String, pipe } from "effect";

import type { IngestJob } from "#/features/ingest/model/ingest-job";
import { embed } from "#/shared/ai/index.server";
import type { EmbeddingError } from "#/shared/ai/index.server";
import { sealMessage } from "#/shared/crypto/index.server";
import { db, message } from "#/shared/db/index.server";
import type { DiscordMessage } from "#/shared/discord/index.server";

import { findStored } from "./message-rows.server";
import type { StoredMessage } from "./message-rows.server";
import { deleteVectors, indexedIds, upsertVectors } from "./vectors.server";
import type { MessageVector, VectorizeError } from "./vectors.server";

const STORED_TYPES: ReadonlySet<MessageType> = new Set([MessageType.Default, MessageType.Reply]);

type StoreError = EmbeddingError | VectorizeError;

type StoreTarget = Readonly<{ key: CryptoKey; job: IngestJob }>;

const editedAtOf = ({ edited_timestamp }: DiscordMessage): Option.Option<DateTime.Utc> =>
  Option.fromNullOr(edited_timestamp);

const isChanged = (stored: readonly StoredMessage[], incoming: DiscordMessage): boolean =>
  Option.match(
    Array.findFirst(stored, ({ id }) => id === incoming.id),
    {
      onNone: () => true,
      onSome: ({ editedAt }) =>
        !Equal.equals(editedAt, Option.map(editedAtOf(incoming), DateTime.toEpochMillis)),
    },
  );

const authorNameOf = ({ author }: DiscordMessage): string =>
  Option.getOrElse(Option.fromNullishOr(author.global_name), () => author.username);

type MessageRow = typeof message.$inferInsert;

const toRow = ({ key, job }: StoreTarget, incoming: DiscordMessage): Effect.Effect<MessageRow> =>
  sealMessage(
    {
      authorName: authorNameOf(incoming),
      content: incoming.content,
      attachments: incoming.attachments,
    },
    key,
    { ...job, messageId: incoming.id },
  ).pipe(
    Effect.map((sealed) => ({
      ...job,
      id: incoming.id,
      authorId: incoming.author.id,
      sealed,
      createdAt: DateTime.toDate(incoming.timestamp),
      editedAt: Option.getOrNull(Option.map(editedAtOf(incoming), DateTime.toDate)),
    })),
  );

const writeRows = (target: StoreTarget, changed: readonly DiscordMessage[]): Effect.Effect<void> =>
  pipe(
    changed,
    Effect.forEach((incoming) => toRow(target, incoming)),
    Effect.map((rows) =>
      rows.map((row) =>
        db
          .insert(message)
          .values(row)
          .onConflictDoUpdate({
            target: message.id,
            set: { sealed: row.sealed, editedAt: row.editedAt },
          }),
      ),
    ),
    Effect.flatMap((statements) =>
      Array.match(statements, {
        onEmpty: () => Effect.void,
        onNonEmpty: (batch) => Effect.asVoid(Effect.promise(() => db.batch(batch))),
      }),
    ),
  );

const toVector = (
  job: IngestJob,
  { id }: DiscordMessage,
  values: readonly number[],
): MessageVector => ({ ...job, id, values });

const writeVectors = (
  { job }: StoreTarget,
  changed: readonly DiscordMessage[],
): Effect.Effect<void, EmbeddingError | VectorizeError> => {
  const blank = changed.filter(({ content }) => String.isEmpty(content));
  const indexable = changed.filter(({ content }) => String.isNonEmpty(content));
  const texts = indexable.map(({ content }) => content);
  return deleteVectors(blank.map(({ id }) => id)).pipe(
    Effect.andThen(embed(texts)),
    Effect.map((embeddings) =>
      Array.zipWith(indexable, embeddings, (incoming, values) => toVector(job, incoming, values)),
    ),
    Effect.flatMap((vectors) => upsertVectors(vectors)),
  );
};

const withoutVectors = (
  unchanged: readonly DiscordMessage[],
): Effect.Effect<readonly DiscordMessage[], VectorizeError> => {
  const indexable = unchanged.filter(({ content }) => String.isNonEmpty(content));
  return indexedIds(indexable.map(({ id }) => id)).pipe(
    Effect.map((indexed) => indexable.filter(({ id }) => !indexed.has(id))),
  );
};

const storeMessages = ({
  page,
  ...target
}: StoreTarget & Readonly<{ page: readonly DiscordMessage[] }>): Effect.Effect<
  void,
  EmbeddingError | VectorizeError
> => {
  const kept = page.filter(({ type }) => STORED_TYPES.has(type));
  return findStored(kept.map(({ id }) => id)).pipe(
    Effect.flatMap((stored) => {
      const changed = kept.filter((incoming) => isChanged(stored, incoming));
      const unchanged = kept.filter((incoming) => !isChanged(stored, incoming));
      return withoutVectors(unchanged).pipe(
        Effect.map((missing) => [...changed, ...missing]),
        Effect.tap((stale) => writeVectors(target, stale)),
        Effect.flatMap((stale) => writeRows(target, stale)),
      );
    }),
  );
};

export { storeMessages };
export type { StoreError, StoreTarget };
