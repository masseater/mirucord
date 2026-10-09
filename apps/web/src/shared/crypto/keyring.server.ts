import { Credentials, fromCredentials } from "@distilled.cloud/aws/Credentials";
import { decrypt, generateDataKeyWithoutPlaintext } from "@distilled.cloud/aws/kms";
import { env } from "cloudflare:workers";
import { Config, ConfigProvider, Effect, Layer, ManagedRuntime, Option, Redacted } from "effect";
import { FetchHttpClient } from "effect/http";
import { CompactEncrypt, base64url, compactDecrypt } from "jose";

const KEY_BITS = 256;
const KEY_BYTES = 32;
const WRAP_INFO = "mirucord/guild-key-wrap";
const GUILD_KEY_ALGORITHMS = { alg: "A256KW", enc: "A256GCM" } as const;
const KMS_PREFIX = "aws-kms:";

type KmsSettings = Readonly<{
  keyId: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}>;

const textEncoder = new TextEncoder();

const kmsSettings: Effect.Effect<Option.Option<KmsSettings>> = Config.option(
  Config.all({
    keyId: Config.NonEmptyString("AWS_KMS_KEY_ID"),
    region: Config.NonEmptyString("AWS_REGION"),
    accessKeyId: Config.NonEmptyString("AWS_ACCESS_KEY_ID"),
    secretAccessKey: Config.NonEmptyString("AWS_SECRET_ACCESS_KEY"),
  }),
)
  .parse(ConfigProvider.fromUnknown(env))
  .pipe(Effect.orDie);

const staticCredentials = (kms: KmsSettings): Layer.Layer<Credentials> =>
  fromCredentials(
    { accessKeyId: kms.accessKeyId, secretAccessKey: kms.secretAccessKey },
    kms.region,
  );

const missingCredentials: Layer.Layer<Credentials> = Layer.succeed(
  Credentials,
  Effect.die(new Error("AWS KMS is not configured")),
);

const kmsCredentials = kmsSettings.pipe(
  Effect.map(Option.match({ onNone: () => missingCredentials, onSome: staticCredentials })),
);

const kmsRuntime = ManagedRuntime.make(
  Layer.mergeAll(Layer.unwrap(kmsCredentials), FetchHttpClient.layer),
);

const runKms = <Success, Failure>(
  operation: Effect.Effect<
    Success,
    Failure,
    ManagedRuntime.ManagedRuntime.Services<typeof kmsRuntime>
  >,
): Effect.Effect<Success> => Effect.promise(() => kmsRuntime.runPromise(operation));

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

const createWithMasterKey: Effect.Effect<string> = Effect.gen(function* createWithMasterKey() {
  const kek = yield* wrappingKey;
  const key = yield* Effect.sync(() => crypto.getRandomValues(new Uint8Array(KEY_BYTES)));
  return yield* Effect.promise(() =>
    new CompactEncrypt(key).setProtectedHeader(GUILD_KEY_ALGORITHMS).encrypt(kek),
  );
});

const createWithKms = (keyId: string): Effect.Effect<string> =>
  runKms(
    generateDataKeyWithoutPlaintext({ KeyId: keyId, KeySpec: "AES_256" }).pipe(
      Effect.map(({ CiphertextBlob }) => Option.fromUndefinedOr(CiphertextBlob)),
      Effect.flatMap(Effect.fromOption),
    ),
  ).pipe(Effect.map((blob) => `${KMS_PREFIX}${base64url.encode(blob)}`));

const createGuildKey: Effect.Effect<string> = kmsSettings.pipe(
  Effect.flatMap(
    Option.match({
      onNone: () => createWithMasterKey,
      onSome: ({ keyId }) => createWithKms(keyId),
    }),
  ),
);

const openWithMasterKey = (wrappedKey: string): Effect.Effect<Uint8Array> =>
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

const openWithKms = (blob: string): Effect.Effect<Uint8Array> =>
  kmsSettings.pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.die(new Error("A KMS-wrapped guild key needs AWS_KMS_KEY_ID to open")),
        onSome: (kms) =>
          runKms(
            decrypt({ CiphertextBlob: base64url.decode(blob), KeyId: kms.keyId }).pipe(
              Effect.map(({ Plaintext }) => Option.fromUndefinedOr(Plaintext)),
              Effect.flatMap(Effect.fromOption),
            ),
          ).pipe(
            Effect.map((plaintext) => {
              if (Redacted.isRedacted(plaintext)) {
                return Redacted.value(plaintext);
              }
              return plaintext;
            }),
          ),
      }),
    ),
  );

const openGuildKey = (wrappedKey: string): Effect.Effect<CryptoKey> =>
  Option.match(
    Option.liftPredicate(wrappedKey, (candidate) => candidate.startsWith(KMS_PREFIX)),
    {
      onNone: () => openWithMasterKey(wrappedKey),
      onSome: (wrapped) => openWithKms(wrapped.slice(KMS_PREFIX.length)),
    },
  ).pipe(
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
