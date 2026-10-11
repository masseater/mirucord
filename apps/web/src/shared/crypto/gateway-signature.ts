import { Effect, Result } from "effect";
import { Hex } from "effect/encoding";

const SIGNATURE_INFO = "mirucord/gateway-signature";
const GATEWAY_SIGNATURE_HEADER = "x-mirucord-signature";
const GATEWAY_TIMESTAMP_HEADER = "x-mirucord-timestamp";

const textEncoder = new TextEncoder();

type SignedEvent = Readonly<{ botToken: string; timestamp: string; body: string }>;

const signingKey = (botToken: string): Effect.Effect<CryptoKey> =>
  Effect.promise(() =>
    crypto.subtle.importKey("raw", textEncoder.encode(botToken), "HKDF", false, ["deriveKey"]),
  ).pipe(
    Effect.flatMap((material) =>
      Effect.promise(() =>
        crypto.subtle.deriveKey(
          {
            name: "HKDF",
            hash: "SHA-256",
            salt: new Uint8Array(),
            info: textEncoder.encode(SIGNATURE_INFO),
          },
          material,
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign", "verify"],
        ),
      ),
    ),
  );

const signedBytes = ({ timestamp, body }: SignedEvent): Uint8Array<ArrayBuffer> =>
  textEncoder.encode(`${timestamp}.${body}`);

const signGatewayEvent = (event: SignedEvent): Effect.Effect<string> =>
  signingKey(event.botToken).pipe(
    Effect.flatMap((key) =>
      Effect.promise(() => crypto.subtle.sign("HMAC", key, signedBytes(event))),
    ),
    Effect.map((signature) => Hex.encode(new Uint8Array(signature))),
  );

const verifyGatewayEvent = (
  event: SignedEvent & Readonly<{ signature: string }>,
): Effect.Effect<boolean> =>
  Result.match(Hex.decode(event.signature), {
    onFailure: () => Effect.succeed(false),
    onSuccess: (signature) =>
      signingKey(event.botToken).pipe(
        Effect.flatMap((key) =>
          Effect.promise(() =>
            crypto.subtle.verify("HMAC", key, Uint8Array.from(signature), signedBytes(event)),
          ),
        ),
      ),
  });

export { GATEWAY_SIGNATURE_HEADER, GATEWAY_TIMESTAMP_HEADER, signGatewayEvent, verifyGatewayEvent };
export type { SignedEvent };
