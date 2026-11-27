import { Effect } from "effect";

const IV_BYTES = 12;
const START = 0;
const ALGORITHM = "AES-GCM";

const textEncoder = new TextEncoder();

export type SealRequest = Readonly<{ bytes: Uint8Array; key: CryptoKey; context: string }>;

const paramsOf = (iv: Uint8Array<ArrayBuffer>, context: string): AesGcmParams => ({
  name: ALGORITHM,
  iv,
  additionalData: textEncoder.encode(context),
});

const joinSealed = (iv: Uint8Array, sealed: Readonly<ArrayBuffer>): Uint8Array => {
  const joined = new Uint8Array(IV_BYTES + sealed.byteLength);
  joined.set(iv);
  joined.set(new Uint8Array(sealed), IV_BYTES);
  return joined;
};

export const sealBytes = ({ bytes, key, context }: SealRequest): Effect.Effect<Uint8Array> => {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  return Effect.promise(() =>
    crypto.subtle.encrypt(paramsOf(iv, context), key, Uint8Array.from(bytes)),
  ).pipe(Effect.map((sealed) => joinSealed(iv, sealed)));
};

export const openBytes = ({ bytes, key, context }: SealRequest): Effect.Effect<Uint8Array> =>
  Effect.promise(() =>
    crypto.subtle.decrypt(
      paramsOf(bytes.slice(START, IV_BYTES), context),
      key,
      bytes.slice(IV_BYTES),
    ),
  ).pipe(Effect.map((opened) => new Uint8Array(opened)));
