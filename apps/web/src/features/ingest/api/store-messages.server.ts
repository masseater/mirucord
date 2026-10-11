import { MessageType } from "discord-api-types/v10";
import { Array, DateTime, Effect, Equal, Option, String, pipe } from "effect";

import type { IngestJob } from "#/features/ingest/model/ingest-job";
import { DESCRIBE_MODEL, describeImage, embed } from "#/shared/ai/index.server";
import type { EmbeddingError, ImageSource } from "#/shared/ai/index.server";
import { sealMessage } from "#/shared/crypto/index.server";
import type { MessageBody } from "#/shared/crypto/index.server";
import { db, message } from "#/shared/db/index.server";
import type { DiscordMessage } from "#/shared/discord/index.server";

import { findStored } from "./message-rows.server";
import type { StoredMessage } from "./message-rows.server";
import { deleteVectors, indexedIds, upsertVectors } from "./vectors.server";
import type { MessageVector, VectorizeError } from "./vectors.server";

const STORED_TYPES: ReadonlySet<MessageType> = new Set([MessageType.Default, MessageType.Reply]);
const DESCRIBED_IMAGES_PER_MESSAGE = 4;
const DESCRIBE_CONCURRENCY = 4;
const NO_PIXELS = 0;

type StoreError = EmbeddingError | VectorizeError;

type StoreTarget = Readonly<{ key: CryptoKey; job: IngestJob }>;

const editedAtOf = ({ edited_timestamp }: DiscordMessage): Option.Option<DateTime.Utc> =>
  Option.fromNullOr(edited_timestamp);

const isChanged = (stored: readonly StoredMessage[], incoming: DiscordMessage): boolean =>
  Option.match(
    Array.findFirst(stored, ({ id }) => id === incoming.id),
    {
      onNone: () => true,
      onSome: ({ editedAt, describedWith }) =>
        !Equal.equals(editedAt, Option.map(editedAtOf(incoming), DateTime.toEpochMillis)) ||
        Option.isNone(describedWith),
    },
  );

const authorNameOf = ({ author }: DiscordMessage): string =>
  Option.getOrElse(Option.fromNullishOr(author.global_name), () => author.username);

type MessageRow = typeof message.$inferInsert;

type DiscordAttachment = DiscordMessage["attachments"][number];
type StoredAttachment = MessageBody["attachments"][number];

type DescribedMessage = Readonly<{
  incoming: DiscordMessage;
  attachments: readonly StoredAttachment[];
}>;

const imageSourceOf = ({
  content_type,
  proxy_url,
  width,
  height,
}: DiscordAttachment): Option.Option<ImageSource> =>
  Option.all({
    contentType: Option.fromUndefinedOr(content_type),
    width: Option.fromNullishOr(width),
    height: Option.fromNullishOr(height),
  }).pipe(
    Option.filter(
      (image) =>
        String.startsWith("image/")(image.contentType) &&
        image.width > NO_PIXELS &&
        image.height > NO_PIXELS,
    ),
    Option.map(({ width: imageWidth, height: imageHeight }) => ({
      proxyUrl: proxy_url,
      width: imageWidth,
      height: imageHeight,
    })),
  );

const isImage = (attachment: DiscordAttachment): boolean =>
  Option.isSome(imageSourceOf(attachment));

const describeAttachment = (
  attachment: DiscordAttachment,
  index: number,
): Effect.Effect<StoredAttachment> => {
  const plain = { filename: attachment.filename, url: attachment.url };
  return Option.match(
    imageSourceOf(attachment).pipe(Option.filter(() => index < DESCRIBED_IMAGES_PER_MESSAGE)),
    {
      onNone: () => Effect.succeed(plain),
      onSome: (source) =>
        describeImage(source).pipe(
          Effect.map(
            Option.match({
              onNone: () => plain,
              onSome: (description) => ({ ...plain, description }),
            }),
          ),
        ),
    },
  );
};

const describeMessage = (incoming: DiscordMessage): Effect.Effect<DescribedMessage> =>
  pipe(
    incoming.attachments,
    Effect.forEach((attachment, index) => describeAttachment(attachment, index)),
    Effect.map((attachments) => ({ incoming, attachments })),
  );

const describeAll = (
  stale: readonly DiscordMessage[],
): Effect.Effect<readonly DescribedMessage[]> =>
  Effect.forEach(stale, (incoming) => describeMessage(incoming), {
    concurrency: DESCRIBE_CONCURRENCY,
  });

const searchTextOf = ({ incoming, attachments }: DescribedMessage): string =>
  [
    incoming.content,
    ...attachments.flatMap(({ description }) =>
      Option.toArray(Option.fromUndefinedOr(description)),
    ),
  ]
    .filter((text) => String.isNonEmpty(text))
    .join("\n");

const toRow = (
  { key, job }: StoreTarget,
  { incoming, attachments }: DescribedMessage,
): Effect.Effect<MessageRow> =>
  sealMessage(
    {
      authorName: authorNameOf(incoming),
      content: incoming.content,
      attachments,
    },
    key,
    { ...job, messageId: incoming.id },
  ).pipe(
    Effect.map((sealed) => ({
      ...job,
      id: incoming.id,
      authorId: incoming.author.id,
      sealed,
      describedWith: DESCRIBE_MODEL,
      createdAt: DateTime.toDate(incoming.timestamp),
      editedAt: Option.getOrNull(Option.map(editedAtOf(incoming), DateTime.toDate)),
    })),
  );

const writeRows = (
  target: StoreTarget,
  changed: readonly DescribedMessage[],
): Effect.Effect<void> =>
  pipe(
    changed,
    Effect.forEach((described) => toRow(target, described)),
    Effect.map((rows) =>
      rows.map((row) =>
        db
          .insert(message)
          .values(row)
          .onConflictDoUpdate({
            target: message.id,
            set: { sealed: row.sealed, editedAt: row.editedAt, describedWith: row.describedWith },
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
  changed: readonly DescribedMessage[],
): Effect.Effect<void, EmbeddingError | VectorizeError> => {
  const blank = changed.filter((described) => String.isEmpty(searchTextOf(described)));
  const indexable = changed.filter((described) => String.isNonEmpty(searchTextOf(described)));
  const texts = indexable.map((described) => searchTextOf(described));
  return deleteVectors(blank.map(({ incoming }) => incoming.id)).pipe(
    Effect.andThen(embed(texts)),
    Effect.map((embeddings) =>
      Array.zipWith(indexable, embeddings, ({ incoming }, values) =>
        toVector(job, incoming, values),
      ),
    ),
    Effect.flatMap((vectors) => upsertVectors(vectors)),
  );
};

const withoutVectors = (
  unchanged: readonly DiscordMessage[],
): Effect.Effect<readonly DiscordMessage[], VectorizeError> => {
  const indexable = unchanged.filter(
    ({ content, attachments }) =>
      String.isNonEmpty(content) || attachments.some((attachment) => isImage(attachment)),
  );
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
        Effect.flatMap(describeAll),
        Effect.tap((stale) => writeVectors(target, stale)),
        Effect.flatMap((stale) => writeRows(target, stale)),
      );
    }),
  );
};

export { storeMessages };
export type { StoreError, StoreTarget };
