import type { ReactNode } from "react";

import { MCP_URL } from "#/shared/config";

const COMMAND = `claude mcp add --transport http mirucord ${MCP_URL}`;

const CommandBox = (): ReactNode => (
  <div className="bg-sumi text-paper rounded-xl px-4 py-3.5 font-mono text-xs">
    <code className="break-all select-all">{COMMAND}</code>
  </div>
);

export { CommandBox };
