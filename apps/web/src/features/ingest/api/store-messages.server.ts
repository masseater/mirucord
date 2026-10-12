import { Discord } from "dfx";
import { Array, Boolean, DateTime, Effect, Equal, Option, String, pipe } from "effect";

import {
  guildStore,
  indexTokens,
  phraseHashes,
  searchableTexts,
} from "#/entities/guild-message/index.server";
import type { IndexedMessage, PhraseState } from "#/entities/guild-message/index.server";
import type { IngestJob } from "#/features/ingest/model/ingest-job";
import { sealMessage } from "#/shared/crypto/index.server";
import type { MessageBody } from "#/shared/crypto/index.server";
import type { DiscordMessage } from "#/shared/discord/index.server";

import { DESCRIBE_MODEL, describeImage, isDescribable } from "./describe-image.server";
import type { ImageSource } from "./describe-image.server";
import { attachmentsOf, bodyOf, hasRichBody } from "./message-body.server";
import type { DiscordAttachment } from "./message-body.server";
import { findStored } from "./message-rows.server";
import type { StoredMessage } from "./message-rows.server";

const STORED_TYPES: ReadonlySet<number> = new Set([
  Discord.MessageType.DEFAULT,
  Discord.MessageType.REPLY,
]);
const DESCRIBED_IMAGES_PER_MESSAGE = 4;
const WITH_RICH_BODY = `${DESCRIBE_MODEL}+rich`;

type StoreTarget = Readonly<{
  key: CryptoKey;
  searchKey: CryptoKey;
  commonKey: CryptoKey;
  job: IngestJob;
}>;

const editedAtOf = ({ edited_timestamp }: DiscordMessage): Option.Option<DateTime.Utc> =>
  Option.fromNullOr(edited_timestamp);

const isChanged = (previous: Option.Option<StoredMessage>, incoming: DiscordMessage): boolean =>
  Option.match(previous, {
    onNone: () => true,
    onSome: ({ editedAt, describedWith }) =>
      !Equal.equals(editedAt, Option.map(editedAtOf(incoming), DateTime.toEpochMillis)) ||
      Option.isNone(describedWith) ||
      (hasRichBody(incoming) && !Option.contains(describedWith, WITH_RICH_BODY)),
  });

const isAutomated = ({ author, webhook_id }: DiscordMessage): boolean =>
  author.bot === true || Option.isSome(Option.fromUndefinedOr(webhook_id));

const phrasesOf = (
  { searchKey, commonKey }: StoreTarget,
  incoming: DiscordMessage,
  body: Pick<MessageBody, "content" | "stickers">,
): Effect.Effect<PhraseState> =>
  Effect.map(
    Boolean.match(isAutomated(incoming), {
      onTrue: () => Effect.succeed([]),
      onFalse: () => phraseHashes({ searchKey, commonKey, source: body }),
    }),
    (hashes) => ({ status: "extracted", hashes }),
  );

const authorNameOf = ({ author }: DiscordMessage): string =>
  Option.getOrElse(Option.fromNullishOr(author.global_name), () => author.username);

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
  Boolean.match(hasRichBody(incoming), {
    onTrue: () => WITH_RICH_BODY,
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
  target: StoreTarget,
  { incoming, attachments, describedWith }: DescribedMessage,
): Effect.Effect<IndexedMessage> => {
  const { key, searchKey, job } = target;
  const body = { authorName: authorNameOf(incoming), ...bodyOf({ incoming, attachments }) };
  return Effect.all({
    sealed: sealMessage(body, key, { ...job, messageId: incoming.id }),
    tokens: indexTokens({ key: searchKey, texts: searchableTexts(body) }),
    phrases: phrasesOf(target, incoming, body),
  }).pipe(
    Effect.map(({ sealed, tokens, phrases }) => ({
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
      phrases,
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
