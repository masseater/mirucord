import type { ReactNode } from "react";

import { MCP_URL } from "#/shared/config";

const PROMPT = `この MCP サーバーを登録して\n${MCP_URL}`;

const RegisterPrompt = (): ReactNode => (
  <p className="bg-dc-rail border-dc-line text-dc-text rounded-sm border px-3 py-2.5 text-sm wrap-break-word whitespace-pre-line select-all">
    {PROMPT}
  </p>
);

export { RegisterPrompt };
