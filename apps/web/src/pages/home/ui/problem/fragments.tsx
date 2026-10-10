import type { ReactNode } from "react";

import { MEMBERS } from "#/pages/home/ui/common/members";
import { PLACES } from "#/pages/home/ui/common/places";
import type { Place } from "#/pages/home/ui/common/places";
import type { ChannelKind } from "#/shared/discord";
import { ChannelIcon } from "#/shared/ui/channel-icon";

import { FragmentCard } from "./fragment-card";

const THREAD = "·";

const describe = (place: Place): Readonly<{ kind: ChannelKind; label: string }> => {
  if (place.type === "thread") {
    return { kind: "text", label: `${place.name} ${THREAD} ${place.parent}` };
  }
  return { kind: place.kind, label: place.name };
};

const GHOST = (
  <span aria-hidden="true" className="scene-frag-ghost">
    <span className="grid min-h-0 gap-1.5 overflow-hidden">
      <span className="bg-dc-line h-2 w-3/4 rounded-full" />
      <span className="bg-dc-line h-2 w-1/2 rounded-full" />
    </span>
  </span>
);

const renderPlace = (place: Place): ReactNode => {
  const { kind, label } = describe(place);
  return (
    <>
      <span className="bg-dc-active text-dc-bright flex max-w-full min-w-0 items-center gap-1 justify-self-start rounded-full px-2 py-0.5 text-xs font-bold">
        <ChannelIcon kind={kind} size="sm" />
        <span className="truncate">{label}</span>
      </span>
      {GHOST}
    </>
  );
};

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
    {FRAGMENTS.map((fragment) => (
      <FragmentCard
        key={fragment.text}
        className="scene-frag"
        member={fragment.member}
        text={fragment.text}
      >
        {renderPlace(fragment.place)}
      </FragmentCard>
    ))}
  </ul>
);

export { FRAGMENTS, Fragments };
