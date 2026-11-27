import { Effect, Function } from "effect";

import { seal, unseal } from "./text-envelope.server";

const DATA_FIRST_ARITY = 3;

export interface Sealer<Body, Address> {
  (key: CryptoKey, address: Address): (body: Body) => Effect.Effect<string>;
  (body: Body, key: CryptoKey, address: Address): Effect.Effect<string>;
}

export interface Opener<Body, Address> {
  (key: CryptoKey, address: Address): (sealed: string) => Effect.Effect<Body>;
  (sealed: string, key: CryptoKey, address: Address): Effect.Effect<Body>;
}

export const typedEnvelope = <Body, Address, EncodeError, DecodeError>({
  encode,
  decode,
  contextOf,
}: Readonly<{
  encode: (body: Body) => Effect.Effect<string, EncodeError>;
  decode: (text: string) => Effect.Effect<Body, DecodeError>;
  contextOf: (address: Address) => string;
}>): Readonly<{ seal: Sealer<Body, Address>; open: Opener<Body, Address> }> => ({
  seal: Function.dual(
    DATA_FIRST_ARITY,
    (body: Body, key: CryptoKey, address: Address): Effect.Effect<string> =>
      encode(body).pipe(
        Effect.orDie,
        Effect.flatMap((text) => seal(text, key, contextOf(address))),
      ),
  ),
  open: Function.dual(
    DATA_FIRST_ARITY,
    (sealed: string, key: CryptoKey, address: Address): Effect.Effect<Body> =>
      unseal(sealed, key, contextOf(address)).pipe(Effect.flatMap(decode), Effect.orDie),
  ),
});
