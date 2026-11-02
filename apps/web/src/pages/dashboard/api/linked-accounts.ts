import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";

import type { PublishResult } from "#/features/linked-accounts/index.server";

import type { SignedOut } from "./dashboard.server";
import {
  discardDraftFor,
  loadLinkedAccountsPage,
  publishFor,
  withdrawFor,
} from "./linked-accounts.server";
import type { DoneResult } from "./linked-accounts.server";

const ConnectionKeySchema = Schema.Struct({ type: Schema.String, name: Schema.String });

const PublishInput = Schema.Struct({ selected: Schema.Array(ConnectionKeySchema) });

const getLinkedAccounts = createServerFn({ method: "GET" }).handler(() =>
  Effect.runPromise(loadLinkedAccountsPage),
);

const postPublish = createServerFn({ method: "POST" })
  .validator(Schema.toStandardSchemaV1(PublishInput))
  .handler(({ data }) => Effect.runPromise(publishFor(data.selected)));

const postDiscardDraft = createServerFn({ method: "POST" }).handler(() =>
  Effect.runPromise(discardDraftFor),
);

const postWithdraw = createServerFn({ method: "POST" }).handler(() =>
  Effect.runPromise(withdrawFor),
);

const linkedAccountsQuery = queryOptions({
  queryKey: ["dashboard", "linked-accounts"],
  queryFn: () => getLinkedAccounts(),
});

const publishLinkedAccounts = (
  selected: typeof PublishInput.Type.selected,
): Promise<PublishResult | SignedOut> => postPublish({ data: { selected } });

const discardLinkedAccountsDraft = (): Promise<DoneResult> => postDiscardDraft();

const withdrawLinkedAccounts = (): Promise<DoneResult> => postWithdraw();

export {
  discardLinkedAccountsDraft,
  linkedAccountsQuery,
  publishLinkedAccounts,
  withdrawLinkedAccounts,
};
