import { env } from "cloudflare:workers";
import { Data, Effect, Option } from "effect";
import { CompactEncrypt, compactDecrypt } from "jose";

const KEY_BITS = 256;
const KEY_BYTES = 32;
const WRAP_INFO = "mirucord/guild-key-wrap";
const GUILD_KEY_ALGORITHMS = { alg: "A256KW", enc: "A256GCM" } as const;

const textEncoder = new TextEncoder();

class WrongMasterKey extends Data.TaggedError("WrongMasterKey") {}

const currentMasterKey: Effect.Effect<SecretsStoreSecret> = Effect.sync(() => env.MASTER_KEY);

const previousMasterKey: Effect.Effect<Option.Option<SecretsStoreSecret>> = Effect.sync(() =>
  Option.fromUndefinedOr(env.MASTER_KEY_PREVIOUS),
);

const wrappingKeyOf = (masterKey: Effect.Effect<SecretsStoreSecret>): Effect.Effect<CryptoKey> =>
  masterKey.pipe(
    Effect.flatMap((secret) => Effect.promise(() => secret.get())),
    Effect.flatMap((text) =>
      Effect.promise(() =>
        crypto.subtle.importKey("raw", textEncoder.encode(text), "HKDF", false, ["deriveKey"]),
      ),
    ),
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

const wrapWithCurrent = (rawKey: Effect.Effect<Uint8Array>): Effect.Effect<string> =>
  Effect.all([rawKey, wrappingKeyOf(currentMasterKey)]).pipe(
    Effect.flatMap(([key, kek]) =>
      Effect.promise(() =>
        new CompactEncrypt(key).setProtectedHeader(GUILD_KEY_ALGORITHMS).encrypt(kek),
      ),
    ),
  );

const createGuildKey: Effect.Effect<string> = wrapWithCurrent(
  Effect.sync(() => crypto.getRandomValues(new Uint8Array(KEY_BYTES))),
);

const unwrapWith = (
  masterKey: Effect.Effect<SecretsStoreSecret>,
  wrappedKey: string,
): Effect.Effect<Uint8Array, WrongMasterKey> =>
  wrappingKeyOf(masterKey).pipe(
    Effect.flatMap((kek) =>
      Effect.tryPromise({
        try: () =>
          compactDecrypt(wrappedKey, kek, {
            keyManagementAlgorithms: [GUILD_KEY_ALGORITHMS.alg],
            contentEncryptionAlgorithms: [GUILD_KEY_ALGORITHMS.enc],
          }),
        catch: () => new WrongMasterKey(),
      }),
    ),
    Effect.map(({ plaintext }) => plaintext),
  );

const unwrapWithPrevious = (wrappedKey: string): Effect.Effect<Uint8Array> =>
  previousMasterKey.pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.die(new Error("The guild key does not open with MASTER_KEY")),
        onSome: (previous) => unwrapWith(Effect.succeed(previous), wrappedKey).pipe(Effect.orDie),
      }),
    ),
  );

const openGuildKey = (wrappedKey: string): Effect.Effect<CryptoKey> =>
  unwrapWith(currentMasterKey, wrappedKey).pipe(
    Effect.catchTag("WrongMasterKey", () => unwrapWithPrevious(wrappedKey)),
    Effect.flatMap((raw) =>
      Effect.promise(() =>
        crypto.subtle.importKey("raw", Uint8Array.from(raw), "AES-GCM", false, [
          "encrypt",
          "decrypt",
        ]),
      ),
    ),
  );

const rewrapGuildKey = (wrappedKey: string): Effect.Effect<Option.Option<string>> =>
  unwrapWith(currentMasterKey, wrappedKey).pipe(
    Effect.as(Option.none<string>()),
    Effect.catchTag("WrongMasterKey", () =>
      wrapWithCurrent(unwrapWithPrevious(wrappedKey)).pipe(Effect.asSome),
    ),
  );

const isRotating: Effect.Effect<boolean> = previousMasterKey.pipe(Effect.map(Option.isSome));

export { createGuildKey, isRotating, openGuildKey, rewrapGuildKey };
