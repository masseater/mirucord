import type { ReactNode } from "react";

import { MEMBERS } from "#/pages/home/ui/common/members";
import { PLACES } from "#/pages/home/ui/common/places";

import { FragmentCard } from "./fragment-card";
import { FragmentPlace } from "./fragment-place";

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
        <FragmentPlace place={fragment.place} />
      </FragmentCard>
    ))}
  </ul>
);

export { FRAGMENTS, Fragments };
