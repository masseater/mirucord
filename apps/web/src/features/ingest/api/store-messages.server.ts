import { MessageType } from "discord-api-types/v10";
import { Array, Boolean, DateTime, Effect, Equal, Option, String, pipe } from "effect";

import { guildStore, indexTokens, searchableTexts } from "#/entities/guild-message/index.server";
import type { IndexedMessage } from "#/entities/guild-message/index.server";
import type { IngestJob } from "#/features/ingest/model/ingest-job";
import { sealMessage } from "#/shared/crypto/index.server";
import type { MessageBody } from "#/shared/crypto/index.server";
import type { DiscordMessage } from "#/shared/discord/index.server";

import { DESCRIBE_MODEL, describeImage, isDescribable } from "./describe-image.server";
import type { ImageSource } from "./describe-image.server";
import { findStored } from "./message-rows.server";
import type { StoredMessage } from "./message-rows.server";

const STORED_TYPES: ReadonlySet<MessageType> = new Set([MessageType.Default, MessageType.Reply]);
const DESCRIBED_IMAGES_PER_MESSAGE = 4;
const WITH_FORWARDS = `${DESCRIBE_MODEL}+forwards`;

type StoreTarget = Readonly<{ key: CryptoKey; searchKey: CryptoKey; job: IngestJob }>;

const editedAtOf = ({ edited_timestamp }: DiscordMessage): Option.Option<DateTime.Utc> =>
  Option.fromNullOr(edited_timestamp);

type Forwarded = NonNullable<DiscordMessage["message_snapshots"]>[number]["message"];

const forwardsOf = ({ message_snapshots }: DiscordMessage): readonly Forwarded[] =>
  (message_snapshots ?? []).map(({ message }) => message);

const isForward = (incoming: DiscordMessage): boolean =>
  Array.isReadonlyArrayNonEmpty(forwardsOf(incoming));

const isChanged = (previous: Option.Option<StoredMessage>, incoming: DiscordMessage): boolean =>
  Option.match(previous, {
    onNone: () => true,
    onSome: ({ editedAt, describedWith }) =>
      !Equal.equals(editedAt, Option.map(editedAtOf(incoming), DateTime.toEpochMillis)) ||
      Option.isNone(describedWith) ||
      (isForward(incoming) && !Option.contains(describedWith, WITH_FORWARDS)),
  });

const contentOf = (incoming: DiscordMessage): string =>
  [incoming.content, ...forwardsOf(incoming).map(({ content }) => content)]
    .filter((content) => String.isNonEmpty(content))
    .join("\n");

const attachmentsOf = (incoming: DiscordMessage): readonly DiscordAttachment[] => [
  ...incoming.attachments,
  ...forwardsOf(incoming).flatMap(({ attachments }) => attachments),
];

const authorNameOf = ({ author }: DiscordMessage): string =>
  Option.getOrElse(Option.fromNullishOr(author.global_name), () => author.username);

type DiscordAttachment = DiscordMessage["attachments"][number];
type StoredAttachment = MessageBody["attachments"][number];

type DescribedAttachment = Readonly<{
  status: "described" | "undescribed" | "failed";
  attachment: StoredAttachment;
}>;

type DescribedMessage = Readonly<{
  incoming: DiscordMessage;
  attachments: readonly StoredAttachment[];
  describedWith: string | null;
}>;

const imageSourceOf = ({
  content_type,
  url,
  size,
}: DiscordAttachment): Option.Option<ImageSource> =>
  Option.fromUndefinedOr(content_type).pipe(
    Option.filter(String.startsWith("image/")),
    Option.map((contentType) => ({ url, contentType, size })),
  );

const describeAttachment = (
  attachment: DiscordAttachment,
  index: number,
): Effect.Effect<DescribedAttachment> => {
  const plain = { filename: attachment.filename, url: attachment.url };
  return Option.match(
    imageSourceOf(attachment).pipe(
      Option.filter((source) => isDescribable(source) && index < DESCRIBED_IMAGES_PER_MESSAGE),
    ),
    {
      onNone: () => Effect.succeed({ status: "undescribed", attachment: plain }),
      onSome: (source) =>
        describeImage(source).pipe(
          Effect.map(
            Option.match({
              onNone: (): DescribedAttachment => ({ status: "failed", attachment: plain }),
              onSome: (description): DescribedAttachment => ({
                status: "described",
                attachment: { ...plain, description },
              }),
            }),
          ),
        ),
    },
  );
};

const describedModelOf = (incoming: DiscordMessage): string =>
  Boolean.match(isForward(incoming), {
    onTrue: () => WITH_FORWARDS,
    onFalse: () => DESCRIBE_MODEL,
  });

const describeMessage = (incoming: DiscordMessage): Effect.Effect<DescribedMessage> =>
  pipe(
    attachmentsOf(incoming),
    Effect.forEach((attachment, index) => describeAttachment(attachment, index)),
    Effect.map((results) => ({
      incoming,
      attachments: results.map(({ attachment }) => attachment),
      describedWith: Boolean.match(
        results.some(({ status }) => status === "failed"),
        {
          onTrue: () => Option.getOrNull(Option.none<string>()),
          onFalse: () => describedModelOf(incoming),
        },
      ),
    })),
  );

const describeAll = (
  stale: readonly DiscordMessage[],
): Effect.Effect<readonly DescribedMessage[]> =>
  pipe(
    stale,
    Effect.forEach((incoming) => describeMessage(incoming)),
  );

const toIndexed = (
  { key, searchKey, job }: StoreTarget,
  { incoming, attachments, describedWith }: DescribedMessage,
): Effect.Effect<IndexedMessage> => {
  const body = { authorName: authorNameOf(incoming), content: contentOf(incoming), attachments };
  return Effect.all({
    sealed: sealMessage(body, key, { ...job, messageId: incoming.id }),
    tokens: indexTokens({ key: searchKey, texts: searchableTexts(body) }),
  }).pipe(
    Effect.map(({ sealed, tokens }) => ({
      row: {
        id: incoming.id,
        channelId: job.channelId,
        authorId: incoming.author.id,
        sealed,
        describedWith,
        createdAt: DateTime.toEpochMillis(incoming.timestamp),
        editedAt: Option.getOrNull(Option.map(editedAtOf(incoming), DateTime.toEpochMillis)),
      },
      tokens,
    })),
  );
};

const writeMessages = (
  target: StoreTarget,
  changed: readonly DescribedMessage[],
): Effect.Effect<void> =>
  pipe(
    changed,
    Effect.forEach((described) => toIndexed(target, described)),
    Effect.flatMap((messages) =>
      Array.match(messages, {
        onEmpty: () => Effect.void,
        onNonEmpty: (batch) =>
          Effect.promise(() => guildStore(target.job.guildId).write(batch, "overwrite")),
      }),
    ),
  );

const storeMessages = ({
  page,
  ...target
}: StoreTarget & Readonly<{ page: readonly DiscordMessage[] }>): Effect.Effect<void> => {
  const kept = page.filter(({ type }) => STORED_TYPES.has(type));
  return findStored({ guildId: target.job.guildId, ids: kept.map(({ id }) => id) }).pipe(
    Effect.flatMap((stored) => {
      const byId = new Map(stored.map((row) => [row.id, row]));
      return describeAll(
        kept.filter((incoming) =>
          isChanged(Option.fromUndefinedOr(byId.get(incoming.id)), incoming),
        ),
      );
    }),
    Effect.flatMap((stale) => writeMessages(target, stale)),
  );
};

export { storeMessages };
export type { StoreTarget };
