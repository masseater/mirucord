import type { ReactNode } from "react";

import type { ChannelKind } from "#/shared/discord";
import { ChannelIcon } from "#/shared/ui/channel-icon";

const PageLink = ({
  href,
  name,
  kind,
}: Readonly<{ href: string; name: string; kind: ChannelKind }>): ReactNode => (
  <a
    href={href}
    className="ch-row text-dc-muted hover:bg-dc-hover hover:text-dc-text flex items-center gap-1.5 rounded-sm px-2 py-1 font-bold whitespace-nowrap no-underline"
  >
    <ChannelIcon kind={kind} size="md" />
    {name}
  </a>
);

export { PageLink };
