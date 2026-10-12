import { env } from "cloudflare:workers";
import { Data, Effect, Option } from "effect";
import { CompactEncrypt, compactDecrypt } from "jose";

const KEY_BITS = 256;
const KEY_BYTES = 32;
const WRAP_INFO = "mirucord/guild-key-wrap";
const SEARCH_INFO = "mirucord/message-search";
const GUILD_KEY_ALGORITHMS = { alg: "A256KW", enc: "A256GCM" } as const;

const textEncoder = new TextEncoder();

class WrongMasterKey extends Data.TaggedError("WrongMasterKey") {}

const currentMasterKey: Effect.Effect<SecretsStoreSecret> = Effect.sync(() => env.MASTER_KEY);

const previousMasterKey: Effect.Effect<Option.Option<SecretsStoreSecret>> = Effect.sync(() =>
  Option.fromUndefinedOr(env.MASTER_KEY_PREVIOUS),
);

const DERIVED_KEYS = {
  wrap: {
    info: WRAP_INFO,
    algorithm: { name: "AES-KW", length: KEY_BITS },
    usages: ["wrapKey", "unwrapKey"],
  },
  search: {
    info: SEARCH_INFO,
    algorithm: { name: "HMAC", hash: "SHA-256", length: KEY_BITS },
    usages: ["sign"],
  },
} as const satisfies Record<
  string,
  Readonly<{
    info: string;
    algorithm: AesKeyAlgorithm | HmacKeyGenParams;
    usages: readonly KeyUsage[];
  }>
>;

const deriveFrom = (
  material: Effect.Effect<Uint8Array>,
  purpose: keyof typeof DERIVED_KEYS,
): Effect.Effect<CryptoKey> => {
  const { info, algorithm, usages } = DERIVED_KEYS[purpose];
  return material.pipe(
    Effect.flatMap((raw) =>
      Effect.promise(() =>
        crypto.subtle.importKey("raw", Uint8Array.from(raw), "HKDF", false, ["deriveKey"]),
      ),
    ),
    Effect.flatMap((base) =>
      Effect.promise(() =>
        crypto.subtle.deriveKey(
          { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(), info: textEncoder.encode(info) },
          base,
          algorithm,
          false,
          [...usages],
        ),
      ),
    ),
  );
};

const wrappingKeyOf = (masterKey: Effect.Effect<SecretsStoreSecret>): Effect.Effect<CryptoKey> =>
  deriveFrom(
    masterKey.pipe(
      Effect.flatMap((secret) => Effect.promise(() => secret.get())),
      Effect.map((text) => textEncoder.encode(text)),
    ),
    "wrap",
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

const unwrapGuildKey = (wrappedKey: string): Effect.Effect<Uint8Array> =>
  unwrapWith(currentMasterKey, wrappedKey).pipe(
    Effect.catchTag("WrongMasterKey", () => unwrapWithPrevious(wrappedKey)),
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

const openSearchKey = (wrappedKey: string): Effect.Effect<CryptoKey> =>
  deriveFrom(unwrapGuildKey(wrappedKey), "search");

const openGuildKeys = (
  wrappedKey: string,
): Effect.Effect<Readonly<{ key: CryptoKey; searchKey: CryptoKey }>> =>
  Effect.all({ key: openGuildKey(wrappedKey), searchKey: openSearchKey(wrappedKey) });

const rewrapGuildKey = (wrappedKey: string): Effect.Effect<Option.Option<string>> =>
  unwrapWith(currentMasterKey, wrappedKey).pipe(
    Effect.as(Option.none<string>()),
    Effect.catchTag("WrongMasterKey", () =>
      wrapWithCurrent(unwrapWithPrevious(wrappedKey)).pipe(Effect.asSome),
    ),
  );

const isRotating: Effect.Effect<boolean> = previousMasterKey.pipe(Effect.map(Option.isSome));

export { createGuildKey, isRotating, openGuildKey, openGuildKeys, openSearchKey, rewrapGuildKey };
