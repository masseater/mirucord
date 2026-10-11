import type { ReactNode } from "react";

import { popButtonVariants } from "#/shared/ui/pop-variants";

const NOTE =
  "サーバーの管理者さんが Bot を招待して、取り込みに同意すると使えるようになります。管理者でなければ、管理者さんにお願いしてね。";
const INVITE = "Bot をサーバーに招待する";

const InviteGuide = ({ inviteUrl }: Readonly<{ inviteUrl: string }>): ReactNode => (
  <>
    <p className="text-dc-muted text-sm">{NOTE}</p>
    <a href={inviteUrl} className={popButtonVariants({ tone: "secondary", size: "sm" })}>
      {INVITE}
    </a>
  </>
);

export { InviteGuide };
