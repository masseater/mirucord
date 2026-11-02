import type { QueryStatus } from "@tanstack/react-query";
import { Match, Option } from "effect";
import type { ReactNode } from "react";

import type { LinkedAccountsPage } from "#/pages/dashboard/api/linked-accounts.server";
import { fixable, progress } from "#/pages/dashboard/lib/feedback";

import { FeedbackLine } from "./feedback-line";
import { LinkedAccountBody } from "./linked-account-body";

const LOADING = progress("読み込んでいます");
const UNAVAILABLE = fixable("refresh")("連携アカウントを読み込めませんでした");

const pageOf = (page: LinkedAccountsPage): ReactNode =>
  Match.value(page).pipe(
    Match.discriminator("status")("signedOut", () => false),
    Match.orElse((linked) => <LinkedAccountBody linked={linked} />),
  );

const loadedOf = (data: Option.Option<LinkedAccountsPage>): ReactNode =>
  Option.match(data, { onNone: () => false, onSome: pageOf });

const LinkedAccountState = ({
  status,
  data,
}: Readonly<{ status: QueryStatus; data: Option.Option<LinkedAccountsPage> }>): ReactNode =>
  Match.value(status).pipe(
    Match.when("pending", () => <FeedbackLine feedback={LOADING} />),
    Match.when("error", () => <FeedbackLine feedback={UNAVAILABLE} />),
    Match.orElse(() => loadedOf(data)),
  );

export { LinkedAccountState };
