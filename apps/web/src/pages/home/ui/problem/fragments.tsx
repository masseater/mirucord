import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { MEMBERS } from "#/pages/home/ui/common/members";
import type { Member } from "#/pages/home/ui/common/members";
import { PLACES } from "#/pages/home/ui/common/places";
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
      {pipe(
        ROWS,
        Array.map((row) => (
          <span key={row.id} className={cn("bg-dc-line h-2 rounded-full", row.width)} />
        )),
      )}
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

const tile = ({
  place,
  member,
  text,
}: Readonly<{ place: Place; member: Member; text: string }>): ReactNode => (
  <li
    key={text}
    className="scene-frag bg-dc-sidebar border-dc-line grid gap-1 rounded-lg border px-3 py-2 text-sm"
  >
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

const FRAGMENTS = [
  {
    place: PLACES.announce,
    member: MEMBERS.miho,
    text: "8/11〜12 キャンプ！ 駅に 9 時集合",
  },
  { place: PLACES.campPlan, member: MEMBERS.kenta, text: "カレーの材料 買っといた" },
  {
    place: PLACES.hitori,
    member: MEMBERS.tanaka,
    text: "次こそカレー焦がさないって誓う",
  },
  { place: PLACES.recipe, member: MEMBERS.miho, text: "カレーは弱火でじっくり" },
  { place: PLACES.photo, member: MEMBERS.yui, text: "カレー焦げてるの 写ってた笑" },
  { place: PLACES.hansei, member: MEMBERS.kenta, text: "火力つよすぎでは" },
  { place: PLACES.game, member: MEMBERS.tanaka, text: "キャンプ前に 1 戦だけやろ" },
  { place: PLACES.kansou, member: MEMBERS.yui, text: "この前のキャンプ 最高だった" },
] as const;

const Fragments = (): ReactNode => (
  <ul className="scene-frags">
    {pipe(
      FRAGMENTS,
      Array.map((fragment) => tile(fragment)),
    )}
  </ul>
);

export { FRAGMENTS, Fragments };
