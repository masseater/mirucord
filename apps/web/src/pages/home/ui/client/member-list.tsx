import type { ReactNode } from "react";

import { MEMBERS } from "#/pages/home/ui/common/members";
import { BOT, memberAuthor } from "#/pages/home/ui/message/author";

import { MemberGroup } from "./member-group";
import { MemberRow } from "./member-row";

const LABEL = "メンバー";
const BOTS = "BOT — 1";
const ONLINE = "オンライン — 4";

const MemberList = (): ReactNode => (
  <aside
    aria-label={LABEL}
    className="bg-dc-sidebar sticky top-0 hidden h-dvh w-60 shrink-0 px-2 pt-2 xl:block"
  >
    <MemberGroup label={BOTS}>
      <MemberRow author={BOT} />
    </MemberGroup>
    <MemberGroup label={ONLINE}>
      {Object.values(MEMBERS).map((member) => (
        <MemberRow key={member.name} author={memberAuthor(member)} />
      ))}
    </MemberGroup>
  </aside>
);

export { MemberList };
