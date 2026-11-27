import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";
import type { ChannelKind } from "#/shared/discord";
import { cn } from "#/shared/lib/utils";
import { ChannelIcon } from "#/shared/ui/channel-icon";

export const ChannelLink = ({
  href,
  name,
  kind,
  tracked,
}: Readonly<{ href: string; name: string; kind: ChannelKind; tracked: boolean }>): ReactNode => (
  <a
    href={href}
    className={cn(
      "ch-row text-dc-muted hover:bg-dc-hover hover:text-dc-text flex items-center gap-1.5 rounded-sm px-2 py-1 font-bold whitespace-nowrap no-underline",
      tracked && "ch-link",
    )}
  >
    <ChannelIcon kind={kind} size="md" />
    {name}
    {tracked && <Mascot className="ch-miru ml-auto size-6" />}
  </a>
);
