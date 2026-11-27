import { Effect, Layer } from "effect";
import { FetchHttpClient, HttpClient } from "effect/http";
import { fromUint8Array } from "js-base64";

const OK_STATUS = 200;

export const fetchBase64 = (url: string): Effect.Effect<string, string> =>
  HttpClient.HttpClient.pipe(
    Effect.flatMap((client) => client.get(url)),
    Effect.filterOrFail(
      ({ status }) => status === OK_STATUS,
      ({ status }) => `status ${status}`,
    ),
    Effect.flatMap((response) => response.arrayBuffer),
    Effect.map((buffer) => fromUint8Array(new Uint8Array(buffer))),
    Effect.catchTag("HttpClientError", (cause) => Effect.fail(cause.reason.name)),
    (call) =>
      FetchHttpClient.layer.pipe(
        Layer.build,
        Effect.flatMap((context) => call.pipe(Effect.provideContext(context))),
        Effect.scoped,
      ),
  );
