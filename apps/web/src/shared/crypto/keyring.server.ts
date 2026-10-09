import { env } from "cloudflare:workers";
import { Effect, Function } from "effect";
import { Base64 } from "effect/encoding";

const DATA_FIRST_ARITY = 3;

const IV_OFFSET = 0;
const IV_LENGTH = 12;
const KEY_BITS = 256;
const WRAP_INFO = "mirucord/guild-key-wrap";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const decodeBase64 = (value: string): Effect.Effect<Uint8Array<ArrayBuffer>> =>
  Effect.fromResult(Base64.decode(value)).pipe(
    Effect.map((bytes) => Uint8Array.from(bytes)),
    Effect.orDie,
  );

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
  const key = yield* Effect.promise(() =>
    crypto.subtle.generateKey({ name: "AES-GCM", length: KEY_BITS }, true, ["encrypt", "decrypt"]),
  );
  const wrapped = yield* Effect.promise(() => crypto.subtle.wrapKey("raw", key, kek, "AES-KW"));
  return Base64.encode(new Uint8Array(wrapped));
});

const openGuildKey = (wrappedKey: string): Effect.Effect<CryptoKey> =>
  Effect.all([wrappingKey, decodeBase64(wrappedKey)]).pipe(
    Effect.flatMap(([kek, bytes]) =>
      Effect.promise(() =>
        crypto.subtle.unwrapKey("raw", bytes, kek, "AES-KW", "AES-GCM", false, [
          "encrypt",
          "decrypt",
        ]),
      ),
    ),
  );

const sealDataFirst = (plaintext: string, key: CryptoKey, context: string): Effect.Effect<string> =>
  Effect.gen(function* sealGen() {
    const iv = yield* Effect.sync(() => crypto.getRandomValues(new Uint8Array(IV_LENGTH)));
    const ciphertext = yield* Effect.promise(() =>
      crypto.subtle.encrypt(
        { name: "AES-GCM", iv, additionalData: textEncoder.encode(context) },
        key,
        textEncoder.encode(plaintext),
      ),
    );
    const sealed = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
    sealed.set(iv);
    sealed.set(new Uint8Array(ciphertext), IV_LENGTH);
    return Base64.encode(sealed);
  });

const seal: {
  (key: CryptoKey, context: string): (plaintext: string) => Effect.Effect<string>;
  (plaintext: string, key: CryptoKey, context: string): Effect.Effect<string>;
} = Function.dual(DATA_FIRST_ARITY, sealDataFirst);

const unsealDataFirst = (sealed: string, key: CryptoKey, context: string): Effect.Effect<string> =>
  decodeBase64(sealed).pipe(
    Effect.flatMap((bytes) =>
      Effect.promise(() =>
        crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv: bytes.subarray(IV_OFFSET, IV_LENGTH),
            additionalData: textEncoder.encode(context),
          },
          key,
          bytes.subarray(IV_LENGTH),
        ),
      ),
    ),
    Effect.map((plaintext) => textDecoder.decode(plaintext)),
  );

const unseal: {
  (key: CryptoKey, context: string): (sealed: string) => Effect.Effect<string>;
  (sealed: string, key: CryptoKey, context: string): Effect.Effect<string>;
} = Function.dual(DATA_FIRST_ARITY, unsealDataFirst);

export { createGuildKey, openGuildKey, seal, unseal };
