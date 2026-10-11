import type { ReactNode } from "react";

import { Panel } from "#/shared/ui/panel";

import { McpUrlCopy } from "./mcp-url-copy";

const McpUrlPanel = ({ title, note }: Readonly<{ title: string; note: string }>): ReactNode => (
  <Panel accent="border-lavender-deep">
    <h2 className="text-dc-bright font-maru text-xl font-black">{title}</h2>
    <McpUrlCopy note={note} />
  </Panel>
);

export { McpUrlPanel };
