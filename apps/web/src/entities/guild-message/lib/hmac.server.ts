import { Effect } from "effect";
import { Hex } from "effect/encoding";

const TOKEN_START = 0;
const TOKEN_BYTES = 8;

const textEncoder = new TextEncoder();

export const hmac = ({
  key,
  text,
}: Readonly<{ key: CryptoKey; text: string }>): Effect.Effect<ArrayBuffer> =>
  Effect.promise(() => crypto.subtle.sign("HMAC", key, textEncoder.encode(text)));

export const tokenOf = (signed: ArrayBuffer): string =>
  Hex.encode(new Uint8Array(signed, TOKEN_START, TOKEN_BYTES));

export const wordOf = (signed: ArrayBuffer): number => new DataView(signed).getUint32(TOKEN_START);
