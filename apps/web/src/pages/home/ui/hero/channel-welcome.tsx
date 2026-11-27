import type { ReactNode } from "react";

import { ActionLinks } from "#/pages/home/ui/common/action-links";
import { Mascot } from "#/shared/brand";
import { MASCOT_NAME } from "#/shared/config";

const LEAD = "みんなの思い出を";
const FOCUS = `${MASCOT_NAME}と見つけよう`;
const HOW = { href: "#how", label: "しくみを見る" };

export const ChannelWelcome = (): ReactNode => (
  <div className="flex flex-col items-start gap-4 px-4 pt-6 pb-2">
    <span className="bg-lavender grid size-20 place-items-center rounded-full">
      <Mascot className="motion-safe:animate-float size-16" />
    </span>
    <h1 className="text-dc-bright font-maru text-4xl leading-tight font-black sm:text-5xl">
      <span className="block">{LEAD}</span>
      <span className="text-lavender-deep block">{FOCUS}</span>
    </h1>
    <ActionLinks className="mt-2 flex flex-wrap gap-3" size="lg" secondary={HOW} />
  </div>
);
