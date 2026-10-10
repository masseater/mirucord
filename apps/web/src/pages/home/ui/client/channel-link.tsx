import type { ReactNode } from "react";

import { ChannelIcon } from "#/pages/home/ui/common/channel-icon";
import type { ChannelKind } from "#/pages/home/ui/common/channel-icon";

const ChannelLink = ({
  id,
  name,
  kind,
}: Readonly<{ id: string; name: string; kind: ChannelKind }>): ReactNode => (
  <a
    href={`#${id}`}
    className="text-dc-muted hover:bg-dc-hover hover:text-dc-text flex items-center gap-1.5 rounded-sm px-2 py-1.5 font-bold whitespace-nowrap no-underline"
  >
    <ChannelIcon kind={kind} size="md" />
    {name}
  </a>
);

export { ChannelLink };
