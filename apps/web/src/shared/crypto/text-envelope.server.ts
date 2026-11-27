import { Effect, Function } from "effect";
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

export const seal: {
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

export const unseal: {
  (key: CryptoKey, context: string): (sealed: string) => Effect.Effect<string>;
  (sealed: string, key: CryptoKey, context: string): Effect.Effect<string>;
} = Function.dual(DATA_FIRST_ARITY, unsealDataFirst);
