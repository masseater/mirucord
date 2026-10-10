import type { ReactNode } from "react";

import { MCP_URL } from "#/shared/config";

const COMMAND = `claude mcp add --transport http mirucord ${MCP_URL}`;

const CommandBox = (): ReactNode => (
  <pre className="bg-dc-rail border-dc-line text-dc-text rounded-sm border px-3 py-2.5 font-mono text-xs whitespace-pre-wrap">
    <code className="break-all select-all">{COMMAND}</code>
  </pre>
);

export { CommandBox };
