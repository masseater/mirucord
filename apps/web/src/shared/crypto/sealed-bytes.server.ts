import { Effect } from "effect";

const IV_BYTES = 12;
const START = 0;
const ALGORITHM = "AES-GCM";

const textEncoder = new TextEncoder();

type SealRequest = Readonly<{ bytes: Uint8Array; key: CryptoKey; context: string }>;

const joinSealed = (iv: Uint8Array, sealed: Readonly<ArrayBuffer>): Uint8Array => {
  const joined = new Uint8Array(IV_BYTES + sealed.byteLength);
  joined.set(iv);
  joined.set(new Uint8Array(sealed), IV_BYTES);
  return joined;
};

const sealBytes = ({ bytes, key, context }: SealRequest): Effect.Effect<Uint8Array> => {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  return Effect.promise(() =>
    crypto.subtle.encrypt(
      { name: ALGORITHM, iv, additionalData: textEncoder.encode(context) },
      key,
      Uint8Array.from(bytes),
    ),
  ).pipe(Effect.map((sealed) => joinSealed(iv, sealed)));
};

const openBytes = ({ bytes, key, context }: SealRequest): Effect.Effect<Uint8Array> =>
  Effect.promise(() =>
    crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: bytes.slice(START, IV_BYTES),
        additionalData: textEncoder.encode(context),
      },
      key,
      bytes.slice(IV_BYTES),
    ),
  ).pipe(Effect.map((opened) => new Uint8Array(opened)));

export { openBytes, sealBytes };
export type { SealRequest };
