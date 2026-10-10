import type { ReactNode } from "react";

import { MEMBERS } from "#/pages/home/ui/common/members";
import { memberAuthor } from "#/pages/home/ui/message/author";
import { AuthorAvatar } from "#/pages/home/ui/message/author-avatar";
import { Message } from "#/pages/home/ui/message/message";

const TEXT = "キャンプの話はスレッドに分けとくね";
const TIME = "今日 21:01";
const NAME = "キャンプ計画";
const COUNT = "128 件のメッセージ ›";
const LAST = "火力つよすぎでは";
const AGO = "3 日前";

const CampThread = (): ReactNode => (
  <Message author={memberAuthor(MEMBERS.kenta)} time={TIME}>
    <p>{TEXT}</p>
    <p className="bg-dc-sidebar flex max-w-md flex-wrap gap-x-2 rounded-t-lg px-3 pt-2 text-sm">
      <span className="text-dc-bright font-bold">{NAME}</span>
      <span className="text-dc-link font-bold">{COUNT}</span>
    </p>
    <p className="bg-dc-sidebar text-dc-muted -mt-1 flex max-w-md items-center gap-1.5 rounded-b-lg px-3 pt-1 pb-2 text-sm">
      <AuthorAvatar author={memberAuthor(MEMBERS.miho)} size="xs" />
      <span className="truncate">{LAST}</span>
      <span className="shrink-0">{AGO}</span>
    </p>
  </Message>
);

export { CampThread };
