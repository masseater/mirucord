import { Effect, Schema } from "effect";

import { seal, unseal } from "./keyring.server";

const MessageBody = Schema.Struct({
  authorName: Schema.String,
  content: Schema.String,
  attachments: Schema.Array(Schema.Struct({ filename: Schema.String, url: Schema.String })),
});

type MessageBody = typeof MessageBody.Type;

const MessageBodyJson = Schema.fromJsonString(MessageBody);
const encodeBody = Schema.encodeSync(MessageBodyJson);
const decodeBody = Schema.decodeUnknownEffect(MessageBodyJson);

type MessageAddress = Readonly<{ guildId: string; channelId: string; messageId: string }>;

const contextOf = ({ guildId, channelId, messageId }: MessageAddress): string =>
  `${guildId}/${channelId}/${messageId}`;

const sealMessage = (
  key: CryptoKey,
  address: MessageAddress,
  body: MessageBody,
): Effect.Effect<string> => seal(key, contextOf(address), encodeBody(body));

const openMessage = (
  key: CryptoKey,
  address: MessageAddress,
  sealed: string,
): Effect.Effect<MessageBody> =>
  unseal(key, contextOf(address), sealed).pipe(Effect.flatMap(decodeBody), Effect.orDie);

export { openMessage, sealMessage };
export type { MessageAddress, MessageBody };
