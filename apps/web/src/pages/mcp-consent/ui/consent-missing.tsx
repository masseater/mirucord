import type { ReactNode } from "react";

import { AppFrame } from "#/shared/ui/app-frame";
import { MascotTip } from "#/shared/ui/mascot-tip";
import { Panel } from "#/shared/ui/panel";

const TIP = "あれれ、つなぐ相手が見つからないよ";
const TITLE = "この画面はアプリから開いてね";
const BODY =
  "Claude などのアプリで mirucord をつなぐと、ここに戻ってくるよ。もう一度アプリからつないでみてね。";

const ConsentMissing = (): ReactNode => (
  <AppFrame>
    <MascotTip>{TIP}</MascotTip>
    <Panel>
      <h1 className="text-dc-bright font-maru text-2xl font-black">{TITLE}</h1>
      <p className="text-dc-muted leading-relaxed">{BODY}</p>
    </Panel>
  </AppFrame>
);

export { ConsentMissing };
