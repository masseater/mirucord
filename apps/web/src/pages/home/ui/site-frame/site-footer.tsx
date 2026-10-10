import type { ReactNode } from "react";

import { SITE_HOST } from "#/shared/config";

const NOTICE = "Discord は Discord Inc. の商標です。mirucord は Discord Inc. とは関係ありません。";

const SiteFooter = (): ReactNode => (
  <footer className="bg-lavender text-ink-soft py-8 text-xs">
    <div className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-4 px-5">
      <span className="font-bold">{SITE_HOST}</span>
      <span>{NOTICE}</span>
    </div>
  </footer>
);

export { SiteFooter };
