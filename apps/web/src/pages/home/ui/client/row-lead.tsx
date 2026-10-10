import type { ReactNode } from "react";

import type { Place } from "#/pages/home/ui/common/places";
import { ChannelIcon } from "#/shared/ui/channel-icon";

const RowLead = ({ place }: Readonly<{ place: Place }>): ReactNode => {
  if (place.type === "thread") {
    return (
      <span className="border-dc-line ml-2 h-3 w-3 shrink-0 -translate-y-1 rounded-bl-md border-b-2 border-l-2" />
    );
  }
  return <ChannelIcon kind={place.kind} size="md" />;
};

export { RowLead };
