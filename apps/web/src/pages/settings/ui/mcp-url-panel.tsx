import type { ReactNode } from "react";

import { MCP_URL } from "#/shared/config";
import { Panel } from "#/shared/ui/panel";

const TITLE = "MCP サーバーの URL";

const McpUrlPanel = (): ReactNode => (
  <Panel>
    <h2 className="text-xl font-black">{TITLE}</h2>
    <p className="bg-lavender rounded-2xl px-4 py-3 font-mono text-sm break-all select-all">
      {MCP_URL}
    </p>
  </Panel>
);

export { McpUrlPanel };
