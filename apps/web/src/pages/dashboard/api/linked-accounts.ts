import { run } from "@r_masseater/workers-tracing/effect";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";

import type { PublishResult } from "#/pages/dashboard/api/linked-account-store.server";

import type { SignedOut } from "./dashboard.server.ts";
import {
  discardDraftFor,
  loadLinkedAccountsPage,
  publishFor,
  withdrawFor,
} from "./linked-accounts.server.ts";
import type { DoneResult } from "./linked-accounts.server.ts";

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

export const linkedAccountsQuery = queryOptions({
  queryKey: ["dashboard", "linked-accounts"],
  queryFn: () => getLinkedAccounts(),
});

export const publishChosenAccounts = (
  selected: typeof PublishInput.Type.selected,
): Promise<PublishResult | SignedOut> => postPublish({ data: { selected } });

export const discardChoosing = (): Promise<DoneResult> => postDiscardDraft();

export const withdrawPublishedAccounts = (): Promise<DoneResult> => postWithdraw();
