import type { ReactNode } from "react";

import { MASCOT_NAME } from "#/shared/config";
import { IconLine } from "#/shared/ui/icon-line";
import { popButtonVariants } from "#/shared/ui/pop-variants";

const NOTE = "管理者さんだけが招待できます";
const INVITE = `${MASCOT_NAME}をサーバーに招待`;

const InviteGuide = ({ inviteUrl }: Readonly<{ inviteUrl: string }>): ReactNode => (
  <>
    <IconLine icon="admin" tone="muted" size="sm">
      {NOTE}
    </IconLine>
    <a href={inviteUrl} className={popButtonVariants({ tone: "secondary", size: "sm" })}>
      {INVITE}
    </a>
  </>
);

export { InviteGuide };
