import type { ReactNode } from "react";

import { ChannelIcon } from "#/shared/ui/channel-icon";
import type { ChannelKind } from "#/shared/ui/channel-icon";

const NO_TOPIC = "";

const ChannelHeader = ({
  name,
  kind,
  topic,
}: Readonly<{ name: string; kind: ChannelKind; topic: string }>): ReactNode => (
  <div className="bg-dc-chat border-dc-rail sticky top-0 z-10 flex h-12 items-center gap-2 border-b px-4">
    <span className="text-dc-muted">
      <ChannelIcon kind={kind} size="lg" />
    </span>
    <span className="text-dc-bright font-bold">{name}</span>
    {topic !== NO_TOPIC && (
      <span className="text-dc-muted border-dc-line ml-2 hidden truncate border-l pl-3 text-sm sm:block">
        {topic}
      </span>
    )}
  </div>
);

export { ChannelHeader };
