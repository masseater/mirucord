import { Effect } from "effect";

import {
  discardLinkedAccountsDraft,
  loadLinkedAccounts,
  publishLinkedAccounts,
  withdrawLinkedAccounts,
} from "#/pages/dashboard/api/linked-account-store.server";
import type {
  ConnectionKey,
  LinkedAccounts,
  PublishResult,
} from "#/pages/dashboard/api/linked-account-store.server";

import { withSignedInAccount } from "./dashboard.server.ts";
import type { SignedOut } from "./dashboard.server.ts";

export type LinkedAccountsPage = LinkedAccounts | SignedOut;

export type DoneResult = SignedOut | Readonly<{ status: "done" }>;

const DONE: DoneResult = { status: "done" };

export const loadLinkedAccountsPage: Effect.Effect<LinkedAccountsPage> =
  withSignedInAccount(loadLinkedAccounts);

export const publishFor = (
  selected: readonly ConnectionKey[],
): Effect.Effect<PublishResult | SignedOut> =>
  withSignedInAccount((owner) => publishLinkedAccounts({ owner, selected }));

export const discardDraftFor: Effect.Effect<DoneResult> = withSignedInAccount((owner) =>
  discardLinkedAccountsDraft(owner).pipe(Effect.as(DONE)),
);

export const withdrawFor: Effect.Effect<DoneResult> = withSignedInAccount((owner) =>
  withdrawLinkedAccounts(owner).pipe(Effect.as(DONE)),
);
