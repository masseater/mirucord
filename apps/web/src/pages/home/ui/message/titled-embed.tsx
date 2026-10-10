import type { ReactNode } from "react";

import { Embed } from "./embed";

const TitledEmbed = ({
  accent,
  title,
  children,
}: Readonly<{ accent: string; title: string; children: ReactNode }>): ReactNode => (
  <Embed accent={accent}>
    <h3 className="text-dc-bright font-bold">{title}</h3>
    {children}
  </Embed>
);

export { TitledEmbed };
