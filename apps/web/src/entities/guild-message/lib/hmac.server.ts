import { Effect } from "effect";
import { Hex } from "effect/encoding";

const TOKEN_START = 0;
const TOKEN_BYTES = 8;

const textEncoder = new TextEncoder();

export const hmacToken = ({
  key,
  text,
}: Readonly<{ key: CryptoKey; text: string }>): Effect.Effect<string> =>
  Effect.promise(() => crypto.subtle.sign("HMAC", key, textEncoder.encode(text))).pipe(
    Effect.map((signature) => Hex.encode(new Uint8Array(signature, TOKEN_START, TOKEN_BYTES))),
  );

export const hmacWord = ({
  key,
  text,
}: Readonly<{ key: CryptoKey; text: string }>): Effect.Effect<number> =>
  Effect.promise(() => crypto.subtle.sign("HMAC", key, textEncoder.encode(text))).pipe(
    Effect.map((signature) => new DataView(signature).getUint32(TOKEN_START)),
  );
