import type { ReactNode } from "react";

import { BOT } from "#/pages/home/ui/message/author";
import { Message } from "#/pages/home/ui/message/message";

import { ClosingActions } from "./closing-actions";
import { ProudMiru } from "./proud-miru";

const GUIDE = "ミルにおまかせ！";
const TIME = "今日 21:10";

const Closing = (): ReactNode => (
  <Message author={BOT} time={TIME}>
    <p>{GUIDE}</p>
    <ProudMiru />
    <ClosingActions />
  </Message>
);

export { Closing };
