import type { ReactNode } from "react";

import type { Member } from "#/pages/home/ui/common/members";
import type { Place } from "#/pages/home/ui/common/places";
import type { ChannelKind } from "#/shared/discord";
import { cn } from "#/shared/lib/utils";
import { ChannelIcon } from "#/shared/ui/channel-icon";

const THREAD = "·";

const ROWS = [
  { id: "a", width: "w-3/4" },
  { id: "b", width: "w-1/2" },
  { id: "c", width: "w-5/6" },
  { id: "d", width: "w-2/3" },
  { id: "e", width: "w-3/4" },
  { id: "f", width: "w-1/2" },
] as const;

const ghost = (): ReactNode => (
  <span aria-hidden="true" className="scene-frag-ghost">
    <span className="scene-frag-scroll grid gap-1.5">
      {ROWS.map((row) => (
        <span key={row.id} className={cn("bg-dc-line h-2 rounded-full", row.width)} />
      ))}
    </span>
  </span>
);

const describe = (place: Place): Readonly<{ kind: ChannelKind; label: string }> => {
  if (place.type === "thread") {
    return { kind: "text", label: `${place.name} ${THREAD} ${place.parent}` };
  }
  return { kind: place.kind, label: place.name };
};

const placeChip = (place: Place): ReactNode => {
  const { kind, label } = describe(place);
  return (
    <span className="bg-dc-active text-dc-bright flex max-w-full min-w-0 items-center gap-1 justify-self-start rounded-full px-2 py-0.5 text-xs font-bold">
      <ChannelIcon kind={kind} size="sm" />
      <span className="truncate">{label}</span>
    </span>
  );
};

const FragmentTile = ({
  place,
  member,
  text,
}: Readonly<{ place: Place; member: Member; text: string }>): ReactNode => (
  <li className="scene-frag bg-dc-sidebar border-dc-line grid gap-1 rounded-lg border px-3 py-2 text-sm">
    <span className="scene-frag-box grid gap-1">
      {placeChip(place)}
      {ghost()}
    </span>
    <span className="scene-frag-msg grid">
      <span className={cn("font-bold", member.tone)}>{member.name}</span>
      <span className="text-dc-text">{text}</span>
    </span>
  </li>
);

export { FragmentTile };
