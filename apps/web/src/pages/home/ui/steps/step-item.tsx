import type { ReactNode } from "react";

import { TitledEmbed } from "#/pages/home/ui/message/titled-embed";

const StepItem = ({
  accent,
  title,
  children,
}: Readonly<{ accent: string; title: string; children: ReactNode }>): ReactNode => (
  <li>
    <TitledEmbed accent={accent} title={title}>
      {children}
    </TitledEmbed>
  </li>
);

export { StepItem };
