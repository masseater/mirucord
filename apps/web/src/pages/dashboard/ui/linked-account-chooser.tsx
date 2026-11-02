import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import type { LinkedChoice } from "#/pages/dashboard/api/linked-account-store.server";
import { connectionKeyOf } from "#/pages/dashboard/model/linked-account-draft";
import { useLinkedAccountForm } from "#/pages/dashboard/model/use-linked-account-form";
import { IconLine } from "#/shared/ui/icon-line";
import { PopButton } from "#/shared/ui/pop-button";

import { LinkedAccountChoiceRow } from "./linked-account-choice-row";

const PICK = "mirucord で見せるものを選んでください";
const NONE = "Discord のプロフィールで全員に公開している連携アカウントがありません";
const PUBLISH = "選んだものを公開する";
const CANCEL = "選ばずにやめる";
const FAILED = "保存できませんでした";

const LinkedAccountChooser = ({
  choices,
}: Readonly<{ choices: readonly LinkedChoice[] }>): ReactNode => {
  const { selected, toggle, publish, discard, publishing, discarding } =
    useLinkedAccountForm(choices);
  const busy = publishing.status === "pending" || discarding.status === "pending";
  return (
    <div className="flex flex-col gap-4">
      <IconLine icon="visible" tone="muted" size="sm">
        {Array.match(choices, { onEmpty: () => NONE, onNonEmpty: () => PICK })}
      </IconLine>
      <ul className="flex flex-col gap-2">
        {pipe(
          choices,
          Array.map((choice) => (
            <LinkedAccountChoiceRow
              key={connectionKeyOf(choice)}
              choice={choice}
              checked={Array.contains(selected, connectionKeyOf(choice))}
              onToggle={toggle}
            />
          )),
        )}
      </ul>
      <div className="flex flex-wrap gap-3">
        <PopButton tone="primary" size="sm" disabled={busy} onClick={publish}>
          {PUBLISH}
        </PopButton>
        <PopButton tone="secondary" size="sm" disabled={busy} onClick={discard}>
          {CANCEL}
        </PopButton>
      </div>
      {(publishing.status === "error" || discarding.status === "error") && (
        <IconLine icon="alert" role="alert" tone="strong" size="sm">
          {FAILED}
        </IconLine>
      )}
    </div>
  );
};

export { LinkedAccountChooser };
