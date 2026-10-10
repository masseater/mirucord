import type { ReactNode } from "react";

import { REPOSITORY_URL } from "#/shared/config";
import { AppFrame } from "#/shared/ui/app-frame";

import { LegalSection } from "./legal-section";

const REVISED = "2026 年 10 月 10 日 制定";
const CONTACT = "問い合わせは GitHub の Issues で受け付けています。";
const ISSUES_URL = `${REPOSITORY_URL}/issues`;

type Section = Readonly<{ heading: string; paragraphs: readonly string[] }>;

const LegalDocument = ({
  title,
  sections,
}: Readonly<{ title: string; sections: readonly Section[] }>): ReactNode => (
  <AppFrame>
    <h1 className="text-3xl font-black">{title}</h1>
    <p className="text-ink-soft text-sm font-bold">{REVISED}</p>
    {sections.map((section) => (
      <LegalSection
        key={section.heading}
        heading={section.heading}
        paragraphs={section.paragraphs}
      />
    ))}
    <a href={ISSUES_URL} className="hover:text-grape self-start font-bold underline">
      {CONTACT}
    </a>
  </AppFrame>
);

export { LegalDocument };
