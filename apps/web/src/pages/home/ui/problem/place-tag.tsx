import type { ReactNode } from "react";

import type { Place } from "#/pages/home/ui/common/places";
import type { ChannelKind } from "#/shared/discord";
import { ChannelIcon } from "#/shared/ui/channel-icon";

const THREAD = "·";

const describe = (place: Place): Readonly<{ kind: ChannelKind; label: string }> => {
  if (place.type === "thread") {
    return { kind: "text", label: `${place.name} ${THREAD} ${place.parent}` };
  }
  return { kind: place.kind, label: place.name };
};

const PlaceTag = ({ place }: Readonly<{ place: Place }>): ReactNode => {
  const { kind, label } = describe(place);
  return (
    <span className="bg-dc-active text-dc-bright flex max-w-full min-w-0 items-center gap-1 justify-self-start rounded-full px-2 py-0.5 text-xs font-bold">
      <ChannelIcon kind={kind} size="sm" />
      <span className="truncate">{label}</span>
    </span>
  );
};

export { PlaceTag };
