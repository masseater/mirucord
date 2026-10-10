import { env } from "cloudflare:workers";
import { Effect } from "effect";
import { CompactEncrypt, compactDecrypt } from "jose";

const KEY_BITS = 256;
const KEY_BYTES = 32;
const WRAP_INFO = "mirucord/guild-key-wrap";
const GUILD_KEY_ALGORITHMS = { alg: "A256KW", enc: "A256GCM" } as const;

const textEncoder = new TextEncoder();

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

const unwrapGuildKey = (wrappedKey: string): Effect.Effect<Uint8Array> =>
  wrappingKey.pipe(
    Effect.flatMap((kek) =>
      Effect.promise(() =>
        compactDecrypt(wrappedKey, kek, {
          keyManagementAlgorithms: [GUILD_KEY_ALGORITHMS.alg],
          contentEncryptionAlgorithms: [GUILD_KEY_ALGORITHMS.enc],
        }),
      ),
    ),
    Effect.map(({ plaintext }) => plaintext),
  );

const openGuildKey = (wrappedKey: string): Effect.Effect<CryptoKey> =>
  unwrapGuildKey(wrappedKey).pipe(
    Effect.flatMap((raw) =>
      Effect.promise(() =>
        crypto.subtle.importKey("raw", Uint8Array.from(raw), "AES-GCM", false, [
          "encrypt",
          "decrypt",
        ]),
      ),
    ),
  );

export { createGuildKey, openGuildKey };
