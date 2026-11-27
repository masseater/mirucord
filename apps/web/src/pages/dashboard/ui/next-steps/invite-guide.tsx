import type { ReactNode } from "react";

import { MASCOT_NAME } from "#/shared/config";
import { IconLine } from "#/shared/ui/icon-line";
import { PopButton } from "#/shared/ui/pop-button";

const NOTE = "管理者さんだけが招待できます";
const INVITE = `${MASCOT_NAME}をサーバーに招待`;

export const InviteGuide = ({ inviteUrl }: Readonly<{ inviteUrl: string }>): ReactNode => (
  <>
    <IconLine icon="admin" tone="muted" size="sm">
      {NOTE}
    </IconLine>
    <PopButton href={inviteUrl} tone="secondary" size="sm">
      {INVITE}
    </PopButton>
  </>
);
