import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";

import { disconnectFor, loadSettings } from "./settings.server";
import type { DisconnectResult } from "./settings.server";

const AppInput = Schema.Struct({ clientId: Schema.String });

const getSettings = createServerFn({ method: "GET" }).handler(() =>
  Effect.runPromise(loadSettings),
);

const postDisconnect = createServerFn({ method: "POST" })
  .validator(Schema.toStandardSchemaV1(AppInput))
  .handler(({ data }) => Effect.runPromise(disconnectFor(data.clientId)));

const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: () => getSettings(),
});

const disconnectConnectedApp = (clientId: string): Promise<DisconnectResult> =>
  postDisconnect({ data: { clientId } });

export { disconnectConnectedApp, settingsQuery };
