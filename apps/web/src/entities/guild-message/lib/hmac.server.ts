import { Effect } from "effect";
import { Hex } from "effect/encoding";

const TOKEN_START = 0;
const TOKEN_BYTES = 8;

const textEncoder = new TextEncoder();

const hmacAs =
  <Out>(project: (signed: ArrayBuffer) => Out) =>
  ({ key, text }: Readonly<{ key: CryptoKey; text: string }>): Effect.Effect<Out> =>
    Effect.promise(() => crypto.subtle.sign("HMAC", key, textEncoder.encode(text))).pipe(
      Effect.map(project),
    );

export const hmacToken = hmacAs((signed) =>
  Hex.encode(new Uint8Array(signed, TOKEN_START, TOKEN_BYTES)),
);

export const hmacWord = hmacAs((signed) => new DataView(signed).getUint32(TOKEN_START));
