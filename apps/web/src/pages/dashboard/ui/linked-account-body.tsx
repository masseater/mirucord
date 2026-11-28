import { Array, Match } from "effect";
import type { ReactNode } from "react";

import type { LinkedAccounts } from "#/pages/dashboard/api/linked-account-store.server";
import type { PublicConnection } from "#/shared/discord/index.server";

import { LinkConnectionsButton } from "./link-connections-button.tsx";
import { LinkedAccountChooser } from "./linked-account-chooser.tsx";
import { LinkedAccountList } from "./linked-account-list.tsx";
import { WithdrawLinkedAccounts } from "./withdraw-linked-accounts.tsx";

const LOAD = "Discord から読み込む";
const RELOAD = "選び直す";

const IdleBody = ({ published }: Readonly<{ published: readonly PublicConnection[] }>): ReactNode =>
  Array.match(published, {
    onEmpty: () => <LinkConnectionsButton label={LOAD} />,
    onNonEmpty: (shown) => (
      <>
        <LinkedAccountList connections={shown} />
        <div className="flex flex-wrap gap-3">
          <LinkConnectionsButton label={RELOAD} />
          <WithdrawLinkedAccounts />
        </div>
      </>
    ),
  });

export const LinkedAccountBody = ({ linked }: Readonly<{ linked: LinkedAccounts }>): ReactNode =>
  Match.value(linked).pipe(
    Match.discriminatorsExhaustive("status")({
      idle: ({ published }) => <IdleBody published={published} />,
      choosing: ({ choices }) => <LinkedAccountChooser choices={choices} />,
    }),
  );
