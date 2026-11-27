import { Effect } from "effect";
import { Hex } from "effect/encoding";

const TOKEN_START = 0;
const TOKEN_BYTES = 8;

const textEncoder = new TextEncoder();

const signature = ({
  key,
  text,
}: Readonly<{ key: CryptoKey; text: string }>): Effect.Effect<ArrayBuffer> =>
  Effect.promise(() => crypto.subtle.sign("HMAC", key, textEncoder.encode(text)));

export const hmacToken = (
  input: Readonly<{ key: CryptoKey; text: string }>,
): Effect.Effect<string> =>
  signature(input).pipe(
    Effect.map((signed) => Hex.encode(new Uint8Array(signed, TOKEN_START, TOKEN_BYTES))),
  );

export const hmacWord = (
  input: Readonly<{ key: CryptoKey; text: string }>,
): Effect.Effect<number> =>
  signature(input).pipe(Effect.map((signed) => new DataView(signed).getUint32(TOKEN_START)));
