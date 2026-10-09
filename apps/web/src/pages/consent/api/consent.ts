import { queryOptions } from "@tanstack/react-query";
import { Effect, Option, Schema } from "effect";

import { authClient } from "#/shared/auth";

const ConsentSearchSchema = Schema.Struct({ client_id: Schema.String });

const validateConsentSearch = Schema.toStandardSchemaV1(ConsentSearchSchema);

const fetchClientName = (clientId: string): Promise<string> =>
  Effect.runPromise(
    Effect.promise(() =>
      authClient.oauth2.publicClient({
        query: { client_id: clientId },
        fetchOptions: { throw: true },
      }),
    ).pipe(
      Effect.map(({ client_name }) =>
        Option.getOrElse(Option.fromNullishOr(client_name), () => clientId),
      ),
    ),
  );

const clientNameQuery = (
  clientId: string,
): ReturnType<typeof queryOptions<string, Error, string, readonly ["oauth-client", string]>> =>
  queryOptions({
    queryKey: ["oauth-client", clientId] as const,
    queryFn: () => fetchClientName(clientId),
  });

export { clientNameQuery, validateConsentSearch };
