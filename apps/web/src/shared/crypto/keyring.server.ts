import { env } from "cloudflare:workers";
import { Effect, Function } from "effect";
import { CompactEncrypt, compactDecrypt } from "jose";

const DATA_FIRST_ARITY = 3;

const KEY_BITS = 256;
const KEY_BYTES = 32;
const WRAP_INFO = "mirucord/guild-key-wrap";
const GUILD_KEY_ALGORITHMS = { alg: "A256KW", enc: "A256GCM" } as const;
const MESSAGE_ALGORITHMS = { alg: "dir", enc: "A256GCM" } as const;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const wrappingKey = Effect.promise(() =>
  crypto.subtle.importKey("raw", textEncoder.encode(env.MASTER_KEY), "HKDF", false, ["deriveKey"]),
).pipe(
  Effect.flatMap((material) =>
    Effect.promise(() =>
      crypto.subtle.deriveKey(
        {
          name: "HKDF",
          hash: "SHA-256",
          salt: new Uint8Array(),
          info: textEncoder.encode(WRAP_INFO),
        },
        material,
        { name: "AES-KW", length: KEY_BITS },
        false,
        ["wrapKey", "unwrapKey"],
      ),
    ),
  ),
);

const createGuildKey: Effect.Effect<string> = Effect.gen(function* createGuildKey() {
  const kek = yield* wrappingKey;
  const key = yield* Effect.sync(() => crypto.getRandomValues(new Uint8Array(KEY_BYTES)));
  return yield* Effect.promise(() =>
    new CompactEncrypt(key).setProtectedHeader(GUILD_KEY_ALGORITHMS).encrypt(kek),
  );
});

const openGuildKey = (wrappedKey: string): Effect.Effect<CryptoKey> =>
  wrappingKey.pipe(
    Effect.flatMap((kek) =>
      Effect.promise(() =>
        compactDecrypt(wrappedKey, kek, {
          keyManagementAlgorithms: [GUILD_KEY_ALGORITHMS.alg],
          contentEncryptionAlgorithms: [GUILD_KEY_ALGORITHMS.enc],
        }),
      ),
    ),
    Effect.flatMap(({ plaintext }) =>
      Effect.promise(() =>
        crypto.subtle.importKey("raw", Uint8Array.from(plaintext), "AES-GCM", false, [
          "encrypt",
          "decrypt",
        ]),
      ),
    ),
  );

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

export { createGuildKey, openGuildKey, seal, unseal };
