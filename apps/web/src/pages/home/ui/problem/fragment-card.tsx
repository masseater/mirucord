import type { ReactNode } from "react";

import type { Member } from "#/pages/home/ui/common/members";
import type { Place } from "#/pages/home/ui/common/places";
import type { ChannelKind } from "#/shared/discord";
import { cn } from "#/shared/lib/utils";
import { ChannelIcon } from "#/shared/ui/channel-icon";

import { FragmentGhost } from "./fragment-ghost";

const THREAD = "·";

const describe = (place: Place): Readonly<{ kind: ChannelKind; label: string }> => {
  if (place.type === "thread") {
    return { kind: "text", label: `${place.name} ${THREAD} ${place.parent}` };
  }
  return { kind: place.kind, label: place.name };
};

const FragmentCard = ({
  place,
  member,
  text,
}: Readonly<{ place: Place; member: Member; text: string }>): ReactNode => {
  const { kind, label } = describe(place);
  return (
    <li className="scene-frag bg-dc-sidebar border-dc-line grid gap-1 rounded-lg border px-3 py-2 text-sm">
      <span className="bg-dc-active text-dc-bright flex max-w-full min-w-0 items-center gap-1 justify-self-start rounded-full px-2 py-0.5 text-xs font-bold">
        <ChannelIcon kind={kind} size="sm" />
        <span className="truncate">{label}</span>
      </span>
      <FragmentGhost />
      <span className={cn("font-bold", member.tone)}>{member.name}</span>
      <span className="text-dc-text">{text}</span>
    </li>
  );
};

export { FragmentCard };
