import { Array, Option, pipe, String } from "effect";

import type { MessageBody } from "#/shared/crypto/index.server";
import type { DiscordMessage } from "#/shared/discord/index.server";

type Forwarded = NonNullable<DiscordMessage["message_snapshots"]>[number]["message"];
type DiscordAttachment = DiscordMessage["attachments"][number];
type DiscordEmbed = DiscordMessage["embeds"][number];
type StoredEmbed = MessageBody["embeds"][number];

const forwardsOf = ({ message_snapshots }: DiscordMessage): readonly Forwarded[] =>
  pipe(
    message_snapshots ?? [],
    Array.map(({ message }) => message),
  );

const contentOf = (incoming: DiscordMessage): string =>
  pipe(
    [
      incoming.content,
      ...pipe(
        forwardsOf(incoming),
        Array.map(({ content }) => content),
      ),
    ],
    Array.filter((content) => String.isNonEmpty(content)),
    Array.join("\n"),
  );

const attachmentsOf = (incoming: DiscordMessage): readonly DiscordAttachment[] => [
  ...incoming.attachments,
  ...pipe(
    forwardsOf(incoming),
    Array.flatMap(({ attachments }) => attachments),
  ),
];

const storedEmbedOf = ({ title, description, url, fields }: DiscordEmbed): StoredEmbed => ({
  title,
  description,
  url,
  fields: pipe(
    fields ?? [],
    Array.map(({ name, value }) => ({ name, value })),
  ),
});

const embedsOf = (incoming: DiscordMessage): readonly StoredEmbed[] =>
  pipe(
    [incoming, ...forwardsOf(incoming)],
    Array.flatMap(({ embeds }) =>
      pipe(
        embeds,
        Array.map((embed) => storedEmbedOf(embed)),
      ),
    ),
  );

const stickersOf = (incoming: DiscordMessage): readonly string[] =>
  pipe(
    [incoming, ...forwardsOf(incoming)],
    Array.flatMap(({ sticker_items }) =>
      pipe(
        sticker_items ?? [],
        Array.map(({ name }) => name),
      ),
    ),
  );

const textOf = (media: Readonly<{ text?: string | undefined }>): string => media.text ?? "";

const pollOf = ({ poll }: DiscordMessage): Option.Option<NonNullable<MessageBody["poll"]>> =>
  Option.fromUndefinedOr(poll).pipe(
    Option.map(({ question, answers }) => ({
      question: textOf(question),
      answers: pipe(
        answers,
        Array.map(({ poll_media }) => textOf(poll_media)),
      ),
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
