import { Effect, Function, Schema } from "effect";
import { CompactEncrypt, compactDecrypt } from "jose";

const DATA_FIRST_ARITY = 3;

const MESSAGE_ALGORITHMS = { alg: "dir", enc: "A256GCM" } as const;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const sealDataFirst = (plaintext: string, key: CryptoKey, context: string): Effect.Effect<string> =>
  Effect.promise(() =>
    new CompactEncrypt(textEncoder.encode(plaintext))
      .setProtectedHeader({ ...MESSAGE_ALGORITHMS, ctx: context })
      .encrypt(key),
  );

const seal: {
  (key: CryptoKey, context: string): (plaintext: string) => Effect.Effect<string>;
  (plaintext: string, key: CryptoKey, context: string): Effect.Effect<string>;
} = Function.dual(DATA_FIRST_ARITY, sealDataFirst);

const unsealDataFirst = (sealed: string, key: CryptoKey, context: string): Effect.Effect<string> =>
  Effect.promise(() =>
    compactDecrypt(sealed, key, {
      keyManagementAlgorithms: [MESSAGE_ALGORITHMS.alg],
      contentEncryptionAlgorithms: [MESSAGE_ALGORITHMS.enc],
    }),
  ).pipe(
    Effect.filterOrFail(
      ({ protectedHeader }) => protectedHeader["ctx"] === context,
      () => new Error("Sealed message does not belong to this address"),
    ),
    Effect.orDie,
    Effect.map(({ plaintext }) => textDecoder.decode(plaintext)),
  );

const unseal: {
  (key: CryptoKey, context: string): (sealed: string) => Effect.Effect<string>;
  (sealed: string, key: CryptoKey, context: string): Effect.Effect<string>;
} = Function.dual(DATA_FIRST_ARITY, unsealDataFirst);

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
