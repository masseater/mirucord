import type { ReactNode } from "react";

import { PRIVACY_PATH, SITE_HOST, TERMS_PATH } from "#/shared/config";

const PRIVACY = "プライバシーポリシー";
const TERMS = "利用規約";
const NOTICE = "Discord は Discord Inc. の商標です。mirucord は Discord Inc. とは関係ありません。";

const SiteFooter = (): ReactNode => (
  <footer className="bg-lavender text-ink-soft py-8 text-xs">
    <div className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-4 px-5">
      <span className="font-bold">{SITE_HOST}</span>
      <a href={PRIVACY_PATH} className="hover:text-blurple font-bold">
        {PRIVACY}
      </a>
      <a href={TERMS_PATH} className="hover:text-blurple font-bold">
        {TERMS}
      </a>
      <span>{NOTICE}</span>
    </div>
  </footer>
);

export { SiteFooter };
