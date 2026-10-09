import { Effect, Function, Schema } from "effect";

import { seal, unseal } from "./keyring.server";

const DATA_FIRST_ARITY = 3;

const MessageBodySchema = Schema.Struct({
  authorName: Schema.String,
  content: Schema.String,
  attachments: Schema.Array(Schema.Struct({ filename: Schema.String, url: Schema.String })),
});

type MessageBody = typeof MessageBodySchema.Type;

const MessageBodyJson = Schema.fromJsonString(MessageBodySchema);
const encodeBody = Schema.encodeEffect(MessageBodyJson);
const decodeBody = Schema.decodeUnknownEffect(MessageBodyJson);

type MessageAddress = Readonly<{ guildId: string; channelId: string; messageId: string }>;

const contextOf = ({ guildId, channelId, messageId }: MessageAddress): string =>
  `${guildId}/${channelId}/${messageId}`;

const sealMessageDataFirst = (
  body: MessageBody,
  key: CryptoKey,
  address: MessageAddress,
): Effect.Effect<string> => {
  const sealWithKey = seal(key, contextOf(address));
  return encodeBody(body).pipe(Effect.orDie, Effect.flatMap(sealWithKey));
};

const sealMessage: {
  (key: CryptoKey, address: MessageAddress): (body: MessageBody) => Effect.Effect<string>;
  (body: MessageBody, key: CryptoKey, address: MessageAddress): Effect.Effect<string>;
} = Function.dual(DATA_FIRST_ARITY, sealMessageDataFirst);

const openMessageDataFirst = (
  sealed: string,
  key: CryptoKey,
  address: MessageAddress,
): Effect.Effect<MessageBody> =>
  unseal(sealed, key, contextOf(address)).pipe(Effect.flatMap(decodeBody), Effect.orDie);

const openMessage: {
  (key: CryptoKey, address: MessageAddress): (sealed: string) => Effect.Effect<MessageBody>;
  (sealed: string, key: CryptoKey, address: MessageAddress): Effect.Effect<MessageBody>;
} = Function.dual(DATA_FIRST_ARITY, openMessageDataFirst);

export { openMessage, sealMessage };
export type { MessageAddress, MessageBody };
