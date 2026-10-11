import type { ReactNode } from "react";

import { MCP_URL } from "#/shared/config";
import { CopyBlock } from "#/shared/ui/copy-block";

const NOTE = "Claude などの MCP に対応したアプリに、この URL をコネクタとして登録してください。";

const RegisterGuide = (): ReactNode => (
  <>
    <p className="text-dc-muted text-sm">{NOTE}</p>
    <CopyBlock text={MCP_URL} />
  </>
);

export { RegisterGuide };
