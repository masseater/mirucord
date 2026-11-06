import { run } from "@r_masseater/workers-tracing/effect";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";

import type { PublishResult } from "#/pages/dashboard/api/linked-account-store.server";

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
  run(loadLinkedAccountsPage),
);

const postPublish = createServerFn({ method: "POST" })
  .validator(Schema.toStandardSchemaV1(PublishInput))
  .handler(({ data }) => run(publishFor(data.selected)));

const postDiscardDraft = createServerFn({ method: "POST" }).handler(() => run(discardDraftFor));

const postWithdraw = createServerFn({ method: "POST" }).handler(() => run(withdrawFor));

const linkedAccountsQuery = queryOptions({
  queryKey: ["dashboard", "linked-accounts"],
  queryFn: () => getLinkedAccounts(),
});

const publishChosenAccounts = (
  selected: typeof PublishInput.Type.selected,
): Promise<PublishResult | SignedOut> => postPublish({ data: { selected } });

const discardChoosing = (): Promise<DoneResult> => postDiscardDraft();

const withdrawPublishedAccounts = (): Promise<DoneResult> => postWithdraw();

export { discardChoosing, linkedAccountsQuery, publishChosenAccounts, withdrawPublishedAccounts };
