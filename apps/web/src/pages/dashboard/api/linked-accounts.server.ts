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

import { withSignedInAccount } from "./dashboard.server";
import type { SignedOut } from "./dashboard.server";

type LinkedAccountsPage = LinkedAccounts | SignedOut;

type DoneResult = SignedOut | Readonly<{ status: "done" }>;

const DONE: DoneResult = { status: "done" };

const loadLinkedAccountsPage: Effect.Effect<LinkedAccountsPage> =
  withSignedInAccount(loadLinkedAccounts);

const publishFor = (selected: readonly ConnectionKey[]): Effect.Effect<PublishResult | SignedOut> =>
  withSignedInAccount((owner) => publishLinkedAccounts({ owner, selected }));

const discardDraftFor: Effect.Effect<DoneResult> = withSignedInAccount((owner) =>
  discardLinkedAccountsDraft(owner).pipe(Effect.as(DONE)),
);

const withdrawFor: Effect.Effect<DoneResult> = withSignedInAccount((owner) =>
  withdrawLinkedAccounts(owner).pipe(Effect.as(DONE)),
);

export { discardDraftFor, loadLinkedAccountsPage, publishFor, withdrawFor };
export type { DoneResult, LinkedAccountsPage };
