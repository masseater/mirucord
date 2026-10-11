import type { ReactNode } from "react";

import { useCopyText } from "./use-copy-text";

const LABELS = {
  idle: "コピー",
  copied: "コピーしたよ！",
  failed: "コピーできなかったよ",
} as const;

const ANNOUNCEMENTS = {
  idle: "",
  copied: LABELS.copied,
  failed: LABELS.failed,
} as const;

const CopyBlock = ({ text }: Readonly<{ text: string }>): ReactNode => {
  const { state, copy } = useCopyText(text);
  return (
    <div className="bg-dc-rail border-dc-line flex w-fit max-w-full items-center gap-2 rounded-sm border py-1.5 pr-1.5 pl-3">
      <p className="text-dc-text min-w-0 flex-1 font-mono text-sm wrap-anywhere select-all">
        {text}
      </p>
      <button
        type="button"
        onClick={copy}
        className="bg-grape hover:bg-grape/85 text-dc-bright shrink-0 rounded-sm px-3 py-1.5 text-sm font-bold"
      >
        {LABELS[state.status]}
      </button>
      <output className="sr-only">{ANNOUNCEMENTS[state.status]}</output>
    </div>
  );
};

export { CopyBlock };
