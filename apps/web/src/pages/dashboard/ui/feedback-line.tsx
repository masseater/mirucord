import { Array, Option, pipe } from "effect";
import type { ReactNode } from "react";

import type { Feedback } from "#/pages/dashboard/lib/feedback";
import { IconLine } from "#/shared/ui/icon-line";

import { RefreshButton } from "./refresh-button";
import { SignInAgain } from "./sign-in-again";

const ICON = { error: "alert", busy: "busy", done: "done" } as const;

const FeedbackLine = ({ feedback }: Readonly<{ feedback: Option.Option<Feedback> }>): ReactNode => {
  const fix = Option.match(feedback, { onNone: () => "none", onSome: (shown) => shown.fix });
  const lines = pipe(
    Option.toArray(feedback),
    Array.map(({ tone, text }) => (
      <IconLine key={text} icon={ICON[tone]}>
        {text}
      </IconLine>
    )),
  );
  return (
    <output className="flex flex-col items-start gap-2 text-sm font-bold">
      {lines}
      {fix === "refresh" && <RefreshButton />}
      {fix === "signIn" && <SignInAgain />}
    </output>
  );
};

export { FeedbackLine };
