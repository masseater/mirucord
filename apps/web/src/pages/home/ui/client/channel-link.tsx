import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";
import { ChannelIcon } from "#/shared/ui/channel-icon";
import type { ChannelKind } from "#/shared/ui/channel-icon";

const ChannelLink = ({
  id,
  name,
  kind,
}: Readonly<{ id: string; name: string; kind: ChannelKind }>): ReactNode => (
  <a
    href={`#${id}`}
    className="ch-link text-dc-muted hover:bg-dc-hover hover:text-dc-text flex items-center gap-1.5 rounded-sm px-2 py-1.5 font-bold whitespace-nowrap no-underline"
  >
    <ChannelIcon kind={kind} size="md" />
    {name}
    <Mascot className="ch-miru ml-auto size-6" />
  </a>
);

export { ChannelLink };
