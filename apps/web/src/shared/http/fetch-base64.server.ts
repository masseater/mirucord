import { Effect, Layer, Schema } from "effect";
import { FetchHttpClient, HttpClient } from "effect/http";
import { fromUint8Array } from "js-base64";

const OK_STATUS = 200;

const taggedError = Schema.TaggedError;

export class FetchError extends taggedError<FetchError, { readonly brand: unique symbol }>()(
  "FetchError",
  { reason: Schema.String },
) {}

export const fetchBase64 = (url: string): Effect.Effect<string, FetchError> =>
  HttpClient.HttpClient.pipe(
    Effect.flatMap((client) => client.get(url)),
    Effect.filterOrFail(
      ({ status }) => status === OK_STATUS,
      ({ status }) => FetchError.make({ reason: `status ${status}` }),
    ),
    Effect.flatMap((response) => response.arrayBuffer),
    Effect.map((buffer) => fromUint8Array(new Uint8Array(buffer))),
    Effect.catchTag("HttpClientError", (cause) =>
      Effect.fail(FetchError.make({ reason: cause.reason.name })),
    ),
    (call) =>
      FetchHttpClient.layer.pipe(
        Layer.build,
        Effect.flatMap((context) => call.pipe(Effect.provideContext(context))),
        Effect.scoped,
      ),
  );
