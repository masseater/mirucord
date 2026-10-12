import type { ReactNode } from "react";

import { MASCOT_NAME } from "#/shared/config";
import { Panel } from "#/shared/ui/panel";

const TITLE = `${MASCOT_NAME}がさがせるサーバー`;

const ReadableGuildSection = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <Panel>
    <h2 className="text-dc-bright font-maru text-xl font-black">{TITLE}</h2>
    {children}
  </Panel>
);

export { ReadableGuildSection };
