import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { Panel } from "#/shared/ui/panel";

const LegalSection = ({
  heading,
  paragraphs,
}: Readonly<{ heading: string; paragraphs: readonly string[] }>): ReactNode => (
  <Panel>
    <h2 className="text-dc-bright font-maru text-xl font-black">{heading}</h2>
    {pipe(
      paragraphs,
      Array.map((paragraph) => (
        <p key={paragraph} className="text-dc-muted leading-loose">
          {paragraph}
        </p>
      )),
    )}
  </Panel>
);

export { LegalSection };
