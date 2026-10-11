import { useAtom } from "@effect/atom-react";
import { Effect, Match } from "effect";
import { Atom } from "effect/reactivity";
import type { ReactNode } from "react";
import { useCallback, useMemo } from "react";
import { useCopyToClipboard } from "usehooks-ts";

type CopyState =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "copied" }>
  | Readonly<{ status: "failed" }>;

const IDLE: CopyState = { status: "idle" };
const COPIED: CopyState = { status: "copied" };
const FAILED: CopyState = { status: "failed" };

const LABELS = {
  idle: "コピー",
  copied: "コピーしたよ！",
  failed: "コピーできなかったよ",
} as const;

const resultState = (copied: boolean): CopyState =>
  Match.value(copied).pipe(
    Match.when(true, () => COPIED),
    Match.orElse(() => FAILED),
  );

const CopyBlock = ({ text }: Readonly<{ text: string }>): ReactNode => {
  const copyStateAtom = useMemo(() => Atom.make<CopyState>(IDLE), []);
  const [state, setState] = useAtom(copyStateAtom);
  const [, copyToClipboard] = useCopyToClipboard();
  const copy = useCallback(() => {
    Effect.runFork(
      Effect.promise(() => copyToClipboard(text)).pipe(
        Effect.map(resultState),
        Effect.tap((next) =>
          Effect.sync(() => {
            setState(next);
          }),
        ),
      ),
    );
  }, [copyToClipboard, setState, text]);
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
      <output className="sr-only">{state.status !== "idle" && LABELS[state.status]}</output>
    </div>
  );
};

export { CopyBlock };
