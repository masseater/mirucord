import type { ReactNode } from "react";

import { MEMBERS } from "#/pages/home/ui/common/members";
import { memberAuthor } from "#/pages/home/ui/message/author";
import { Message } from "#/pages/home/ui/message/message";

import { MEMORY_ID } from "./memory.ts";
import { SeekMiru } from "./seek-miru.tsx";

const EDITED = "(編集済)";

export const Vow = ({ text }: Readonly<{ text: string }>): ReactNode => (
  <Message id={MEMORY_ID} author={memberAuthor(MEMBERS.tanaka)} time="22:14" variant="highlight">
    <p>
      {text}
      <span className="text-dc-muted ml-1 text-xs">{EDITED}</span>
    </p>
    <SeekMiru kind="found" step="2" />
  </Message>
);
