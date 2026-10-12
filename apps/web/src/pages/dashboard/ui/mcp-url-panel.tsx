import type { ReactNode } from "react";

import { MCP_URL } from "#/shared/config";
import { CopyBlock } from "#/shared/ui/copy-block";
import { Panel } from "#/shared/ui/panel";

const McpUrlPanel = ({ title }: Readonly<{ title: string }>): ReactNode => (
  <Panel accent="border-lavender-deep">
    <h2 className="text-dc-bright font-maru text-xl font-black">{title}</h2>
    <CopyBlock text={MCP_URL} />
  </Panel>
);

export { McpUrlPanel };
