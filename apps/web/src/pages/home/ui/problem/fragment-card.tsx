import type { ReactNode } from "react";

import type { Member } from "#/pages/home/ui/common/members";
import type { Place } from "#/pages/home/ui/common/places";
import { cn } from "#/shared/lib/utils";

import { FragmentGhost } from "./fragment-ghost";
import { PlaceTag } from "./place-tag";

const FragmentCard = ({
  place,
  member,
  text,
}: Readonly<{ place: Place; member: Member; text: string }>): ReactNode => (
  <li className="scene-frag bg-dc-sidebar border-dc-line grid gap-1 rounded-lg border px-3 py-2 text-sm">
    <PlaceTag place={place} />
    <FragmentGhost />
    <span className={cn("font-bold", member.tone)}>{member.name}</span>
    <span className="text-dc-text">{text}</span>
  </li>
);

export { FragmentCard };
