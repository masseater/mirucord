import type { ReactNode } from "react";

import { MASCOT_NAME, MCP_URL } from "#/shared/config";
import { CopyBlock } from "#/shared/ui/copy-block";
import { Panel } from "#/shared/ui/panel";

const TITLE = "みんなに使ってもらうには";
const NOTE = `サーバーのメンバーに、Claude などの MCP に対応したアプリへこの URL をコネクタとして登録してもらってね。登録した人は、自分が Discord で見られるチャンネルを${MASCOT_NAME}にさがしてもらえます。`;

const SharePanel = (): ReactNode => (
  <Panel accent="border-lavender-deep">
    <h2 className="text-dc-bright font-maru text-xl font-black">{TITLE}</h2>
    <p className="text-dc-muted text-sm">{NOTE}</p>
    <CopyBlock text={MCP_URL} />
  </Panel>
);

export { SharePanel };
