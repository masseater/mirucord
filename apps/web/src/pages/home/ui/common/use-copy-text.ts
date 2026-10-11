import { useAtom } from "@effect/atom-react";
import { Effect, Match } from "effect";
import { Atom } from "effect/reactivity";
import { useCallback, useId } from "react";
import { useCopyToClipboard } from "usehooks-ts";

type CopyState =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "copied" }>
  | Readonly<{ status: "failed" }>;

const IDLE: CopyState = { status: "idle" };
const COPIED: CopyState = { status: "copied" };
const FAILED: CopyState = { status: "failed" };

const copyStateAtom = Atom.family((blockId: string) =>
  Atom.make<CopyState>(IDLE).pipe(Atom.withLabel(`copy-state:${blockId}`)),
);

const resultState = (copied: boolean): CopyState =>
  Match.value(copied).pipe(
    Match.when(true, () => COPIED),
    Match.orElse(() => FAILED),
  );

const useCopyText = (text: string): Readonly<{ state: CopyState; copy: () => void }> => {
  const [state, setState] = useAtom(copyStateAtom(useId()));
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
  return { state, copy };
};

export { useCopyText };
