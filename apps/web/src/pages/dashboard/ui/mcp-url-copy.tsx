import type { ReactNode } from "react";

import { MCP_URL } from "#/shared/config";
import { CopyBlock } from "#/shared/ui/copy-block";

const McpUrlCopy = ({ note }: Readonly<{ note: string }>): ReactNode => (
  <>
    <p className="text-dc-muted text-sm">{note}</p>
    <CopyBlock text={MCP_URL} />
  </>
);

export { McpUrlCopy };
