import type { ReactNode } from "react";

import type { GuideContent } from "#/pages/guide/model/guide-block";

import { GuideDocument } from "./guide-document.tsx";

export const guidePage = ({ title, tip, lead, sections }: GuideContent): (() => ReactNode) => {
  const GuidePage = (): ReactNode => (
    <GuideDocument title={title} tip={tip} lead={lead} sections={sections} />
  );
  return GuidePage;
};
