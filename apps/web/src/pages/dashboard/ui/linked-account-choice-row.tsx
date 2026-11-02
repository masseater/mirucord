import { useCallback } from "react";
import type { ReactNode } from "react";

import type { LinkedChoice } from "#/features/linked-accounts/index.server";

import { LinkedAccountLine } from "./linked-account-line";

const LinkedAccountChoiceRow = ({
  choice,
  checked,
  onToggle,
}: Readonly<{
  choice: LinkedChoice;
  checked: boolean;
  onToggle: (choice: LinkedChoice) => void;
}>): ReactNode => {
  const toggle = useCallback(() => {
    onToggle(choice);
  }, [choice, onToggle]);
  return (
    <li>
      <label className="border-dc-line has-checked:bg-dc-active flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3">
        <input
          type="checkbox"
          className="accent-grape size-4"
          checked={checked}
          onChange={toggle}
        />
        <LinkedAccountLine connection={choice} />
      </label>
    </li>
  );
};

export { LinkedAccountChoiceRow };
