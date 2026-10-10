import type { ReactNode } from "react";

import { ChannelIcon } from "#/shared/ui/channel-icon";
import type { ChannelKind } from "#/shared/ui/channel-icon";

const ChannelHeader = ({
  name,
  kind = "text",
  children,
}: Readonly<{ name: string; kind?: ChannelKind; children?: ReactNode }>): ReactNode => (
  <div className="ch-header bg-dc-chat border-dc-rail sticky top-0 z-10 flex h-12 items-center gap-2 border-b px-4">
    <span className="text-dc-muted">
      <ChannelIcon kind={kind} size="lg" />
    </span>
    <span className="text-dc-bright font-bold">{name}</span>
    {children}
  </div>
);

export { ChannelHeader };
