import type { ReactNode } from "react";

import { REPOSITORY_URL } from "#/shared/config";
import { AppFrame } from "#/shared/ui/app-frame";
import { MascotTip } from "#/shared/ui/mascot-tip";
import { Panel } from "#/shared/ui/panel";

import { blockKey } from "./guide-block";
import type { GuideSection } from "./guide-block";
import { GuideBlockView } from "./guide-block-view";

const SOURCE = "ソースコードは GitHub で公開しています。";

const GuideDocument = ({
  title,
  tip,
  lead,
  sections,
}: Readonly<{
  title: string;
  tip: string;
  lead: string;
  sections: readonly GuideSection[];
}>): ReactNode => (
  <AppFrame>
    <h1 className="text-dc-bright font-maru text-3xl font-black">{title}</h1>
    <MascotTip>{tip}</MascotTip>
    <p className="text-dc-text leading-loose">{lead}</p>
    {sections.map((section) => (
      <Panel key={section.heading}>
        <h2 className="text-dc-bright font-maru text-xl font-black">{section.heading}</h2>
        {section.blocks.map((block) => (
          <GuideBlockView key={blockKey(block)} block={block} />
        ))}
      </Panel>
    ))}
    <a href={REPOSITORY_URL} className="hover:text-dc-bright self-start font-bold underline">
      {SOURCE}
    </a>
  </AppFrame>
);

export { GuideDocument };
