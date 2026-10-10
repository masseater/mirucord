import type { ReactNode } from "react";

import { Panel } from "#/shared/ui/panel";

const LegalSection = ({
  heading,
  paragraphs,
}: Readonly<{ heading: string; paragraphs: readonly string[] }>): ReactNode => (
  <Panel>
    <h2 className="text-xl font-black">{heading}</h2>
    {paragraphs.map((paragraph) => (
      <p key={paragraph} className="text-ink-soft leading-loose">
        {paragraph}
      </p>
    ))}
  </Panel>
);

export { LegalSection };
