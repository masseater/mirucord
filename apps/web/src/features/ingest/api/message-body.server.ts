import { Array, Option, String } from "effect";

import type { MessageBody } from "#/shared/crypto/index.server";
import type { DiscordMessage } from "#/shared/discord/index.server";

type Forwarded = NonNullable<DiscordMessage["message_snapshots"]>[number]["message"];
type DiscordAttachment = DiscordMessage["attachments"][number];
type DiscordEmbed = DiscordMessage["embeds"][number];
type StoredEmbed = MessageBody["embeds"][number];

const forwardsOf = ({ message_snapshots }: DiscordMessage): readonly Forwarded[] =>
  (message_snapshots ?? []).map(({ message }) => message);

const contentOf = (incoming: DiscordMessage): string =>
  [incoming.content, ...forwardsOf(incoming).map(({ content }) => content)]
    .filter((content) => String.isNonEmpty(content))
    .join("\n");

const attachmentsOf = (incoming: DiscordMessage): readonly DiscordAttachment[] => [
  ...incoming.attachments,
  ...forwardsOf(incoming).flatMap(({ attachments }) => attachments),
];

const storedEmbedOf = ({ title, description, url, fields }: DiscordEmbed): StoredEmbed => ({
  title,
  description,
  url,
  fields: (fields ?? []).map(({ name, value }) => ({ name, value })),
});

const embedsOf = (incoming: DiscordMessage): readonly StoredEmbed[] =>
  [incoming, ...forwardsOf(incoming)].flatMap(({ embeds }) =>
    embeds.map((embed) => storedEmbedOf(embed)),
  );

const stickersOf = (incoming: DiscordMessage): readonly string[] =>
  [incoming, ...forwardsOf(incoming)].flatMap(({ sticker_items }) =>
    (sticker_items ?? []).map(({ name }) => name),
  );

const textOf = (media: Readonly<{ text?: string | undefined }>): string => media.text ?? "";

const pollOf = ({ poll }: DiscordMessage): Option.Option<NonNullable<MessageBody["poll"]>> =>
  Option.fromUndefinedOr(poll).pipe(
    Option.map(({ question, answers }) => ({
      question: textOf(question),
      answers: answers.map(({ poll_media }) => textOf(poll_media)),
    })),
  );

const hasRichBody = (incoming: DiscordMessage): boolean =>
  Array.isReadonlyArrayNonEmpty(forwardsOf(incoming)) ||
  Array.isReadonlyArrayNonEmpty(embedsOf(incoming)) ||
  Array.isReadonlyArrayNonEmpty(stickersOf(incoming)) ||
  Option.isSome(pollOf(incoming));

const bodyOf = ({
  incoming,
  attachments,
}: Readonly<{
  incoming: DiscordMessage;
  attachments: MessageBody["attachments"];
}>): Omit<MessageBody, "authorName"> => ({
  content: contentOf(incoming),
  attachments,
  embeds: embedsOf(incoming),
  stickers: stickersOf(incoming),
  poll: Option.getOrUndefined(pollOf(incoming)),
});

export { attachmentsOf, bodyOf, hasRichBody };
export type { DiscordAttachment };
