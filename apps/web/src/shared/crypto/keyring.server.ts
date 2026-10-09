import { env } from "cloudflare:workers";
import { Effect, Schema } from "effect";

const IV_LENGTH = 12;
const KEY_BITS = 256;
const WRAP_INFO = "mirucord/guild-key-wrap";

const encodeBase64 = Schema.encodeSync(Schema.Uint8ArrayFromBase64);
const decodeBase64Sync = Schema.decodeSync(Schema.Uint8ArrayFromBase64);
const decodeBase64 = (value: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(decodeBase64Sync(value));
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const deriveWrappingKey = Effect.promise(async () => {
  const material = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(env.MASTER_KEY),
    "HKDF",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
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
  );
});

const wrappingKey = Effect.runSync(Effect.cached(deriveWrappingKey));

const createGuildKey: Effect.Effect<string> = Effect.gen(function* createGuildKey() {
  const kek = yield* wrappingKey;
  const wrapped = yield* Effect.promise(async () => {
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: KEY_BITS }, true, [
      "encrypt",
      "decrypt",
    ]);
    return crypto.subtle.wrapKey("raw", key, kek, "AES-KW");
  });
  return encodeBase64(new Uint8Array(wrapped));
});

const openGuildKey = (wrappedKey: string): Effect.Effect<CryptoKey> =>
  Effect.gen(function* openGuildKey() {
    const kek = yield* wrappingKey;
    return yield* Effect.promise(() =>
      crypto.subtle.unwrapKey("raw", decodeBase64(wrappedKey), kek, "AES-KW", "AES-GCM", false, [
        "encrypt",
        "decrypt",
      ]),
    );
  });

const seal = (key: CryptoKey, context: string, plaintext: string): Effect.Effect<string> =>
  Effect.promise(async () => {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: textEncoder.encode(context) },
      key,
      textEncoder.encode(plaintext),
    );
    const sealed = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
    sealed.set(iv);
    sealed.set(new Uint8Array(ciphertext), IV_LENGTH);
    return encodeBase64(sealed);
  });

const unseal = (key: CryptoKey, context: string, sealed: string): Effect.Effect<string> =>
  Effect.promise(async () => {
    const bytes = decodeBase64(sealed);
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: bytes.subarray(0, IV_LENGTH),
        additionalData: textEncoder.encode(context),
      },
      key,
      bytes.subarray(IV_LENGTH),
    );
    return textDecoder.decode(plaintext);
  });

export { createGuildKey, openGuildKey, seal, unseal };
