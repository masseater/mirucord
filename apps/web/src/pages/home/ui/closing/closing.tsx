import type { ReactNode } from "react";

import { Post } from "#/pages/home/ui/message/post";

import { ClosingActions } from "./closing-actions";
import { ProudMiru } from "./proud-miru";

const GUIDE = "ミルにおまかせ！";
const LEAD = "さっそく";
const TAIL = "あの日を思い出そう";
const TIME = "今日 21:10";

const Closing = (): ReactNode => (
  <Post time={TIME} guide={GUIDE} lead={LEAD} tail={TAIL}>
    <ProudMiru />
    <ClosingActions />
  </Post>
);

export { Closing };
