import type { DiscordMessage, DiscordMessageSnapshot } from "@discordeno/types";
import { Effect, Schema } from "effect";

const NO_CONTENT = "";

const MessageText = Schema.String.pipe(Schema.withDecodingDefaultKey(Effect.succeed(NO_CONTENT)));

const Attachment = Schema.Struct({
  filename: Schema.String,
  url: Schema.String,
  size: Schema.Finite,
  content_type: Schema.optional(Schema.String),
});

const Author = Schema.Struct({
  id: Schema.String,
  username: Schema.String,
  global_name: Schema.optional(Schema.NullOr(Schema.String)),
});

type FieldUse = "stored" | "ignored";

type StoredOf<Uses> = { [Key in keyof Uses]: Uses[Key] extends "stored" ? Key : never }[keyof Uses];

const SNAPSHOT_FIELD_USE = {
  content: "stored",
  attachments: "stored",
  components: "ignored",
  edited_timestamp: "ignored",
  embeds: "ignored",
  flags: "ignored",
  mention_roles: "ignored",
  mentions: "ignored",
  sticker_items: "ignored",
  stickers: "ignored",
  timestamp: "ignored",
  type: "ignored",
} as const satisfies Record<keyof DiscordMessageSnapshot["message"], FieldUse>;

const MessageSnapshot = Schema.Struct({
  message: Schema.Struct({
    content: MessageText,
    attachments: Schema.Array(Attachment),
  } satisfies Record<StoredOf<typeof SNAPSHOT_FIELD_USE>, Schema.Top>),
});

const MESSAGE_FIELD_USE = {
  id: "stored",
  type: "stored",
  content: "stored",
  timestamp: "stored",
  edited_timestamp: "stored",
  author: "stored",
  attachments: "stored",
  message_snapshots: "stored",
  activity: "ignored",
  application: "ignored",
  application_id: "ignored",
  call: "ignored",
  channel_id: "ignored",
  components: "ignored",
  embeds: "ignored",
  flags: "ignored",
  guild_id: "ignored",
  interaction: "ignored",
  interaction_metadata: "ignored",
  member: "ignored",
  mention_channels: "ignored",
  mention_everyone: "ignored",
  mention_roles: "ignored",
  mentions: "ignored",
  message_reference: "ignored",
  nonce: "ignored",
  pinned: "ignored",
  poll: "ignored",
  position: "ignored",
  reactions: "ignored",
  referenced_message: "ignored",
  sticker_items: "ignored",
  stickers: "ignored",
  thread: "ignored",
  tts: "ignored",
  webhook_id: "ignored",
} as const satisfies Record<keyof DiscordMessage, FieldUse>;

const Message = Schema.Struct({
  id: Schema.String,
  type: Schema.Finite,
  content: MessageText,
  timestamp: Schema.DateTimeUtcFromString,
  edited_timestamp: Schema.NullOr(Schema.DateTimeUtcFromString),
  author: Author,
  attachments: Schema.Array(Attachment),
  message_snapshots: Schema.optional(Schema.Array(MessageSnapshot)),
} satisfies Record<StoredOf<typeof MESSAGE_FIELD_USE>, Schema.Top>);

export { Message };
