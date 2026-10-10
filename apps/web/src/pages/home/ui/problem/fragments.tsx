import type { ReactNode } from "react";

import { MEMBERS } from "#/pages/home/ui/common/members";

import { FragmentCard } from "./fragment-card";

const FRAGMENTS = [
  {
    place: "# お知らせ・ピン留め",
    member: MEMBERS.miho,
    text: "8/11〜12 キャンプ！ 駅に 9 時集合",
  },
  { place: "スレッド：キャンプ計画", member: MEMBERS.kenta, text: "カレーの材料 買っといた" },
  {
    place: "# ざつだん・2024/08/12",
    member: MEMBERS.tanaka,
    text: "次こそカレー焦がさないって誓う",
  },
  { place: "フォーラム：キャンプ飯レシピ", member: MEMBERS.miho, text: "カレーは弱火でじっくり" },
  { place: "DM", member: MEMBERS.yui, text: "カレーのこと まだ気にしてる？笑" },
  { place: "VC の聞き専チャット", member: MEMBERS.kenta, text: "火力つよすぎでは" },
  { place: "# げーむ部", member: MEMBERS.tanaka, text: "キャンプ前に 1 戦だけやろ" },
  { place: "別サーバー：大学のみんな", member: MEMBERS.yui, text: "この前のキャンプ 最高だった" },
] as const;

const Fragments = (): ReactNode => (
  <ul className="scene-frags">
    {FRAGMENTS.map((fragment) => (
      <FragmentCard
        key={fragment.place}
        place={fragment.place}
        member={fragment.member}
        text={fragment.text}
      />
    ))}
  </ul>
);

export { Fragments };
