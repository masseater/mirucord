import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { REPOSITORY_URL } from "#/shared/config";
import { AppFrame } from "#/shared/ui/app-frame";

import { LegalSection } from "./legal-section";

const REVISED = "2026 年 10 月 10 日 制定、2026 年 10 月 13 日 改定";
const CONTACT = "本サービスに関するお問い合わせは、GitHub の Issues にて受け付ける。";
const ISSUES_URL = `${REPOSITORY_URL}/issues`;

type Section = Readonly<{ heading: string; paragraphs: readonly string[] }>;

const LegalDocument = ({
  title,
  sections,
}: Readonly<{ title: string; sections: readonly Section[] }>): ReactNode => (
  <AppFrame>
    <h1 className="text-dc-bright font-maru text-3xl font-black">{title}</h1>
    <p className="text-dc-muted text-sm font-bold">{REVISED}</p>
    {pipe(
      sections,
      Array.map((section) => (
        <LegalSection
          key={section.heading}
          heading={section.heading}
          paragraphs={section.paragraphs}
        />
      )),
    )}
    <a href={ISSUES_URL} className="hover:text-dc-bright self-start font-bold underline">
      {CONTACT}
    </a>
  </AppFrame>
);

export { LegalDocument };
