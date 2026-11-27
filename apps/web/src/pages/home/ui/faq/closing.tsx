import type { ReactNode } from "react";

import { ActionLinks } from "#/pages/home/ui/common/action-links";
import { BOT } from "#/pages/home/ui/message/author";
import { Message } from "#/pages/home/ui/message/message";
import { MASCOT_NAME, REPOSITORY_URL } from "#/shared/config";

import { ProudMiru } from "./proud-miru";

const GUIDE = `${MASCOT_NAME}におまかせ！`;
const TIME = "今日 21:12";
const SOURCE = { href: REPOSITORY_URL, label: "GitHub を見る" };

export const Closing = (): ReactNode => (
  <Message author={BOT} time={TIME}>
    <p>{GUIDE}</p>
    <ProudMiru />
    <ActionLinks className="mt-1 flex flex-wrap gap-2" size="sm" secondary={SOURCE} />
  </Message>
);
