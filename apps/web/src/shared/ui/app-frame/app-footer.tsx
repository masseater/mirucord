import type { ReactNode } from "react";

import { PRIVACY_PATH, SITE_HOST, TERMS_PATH } from "#/shared/config";

const PRIVACY = "プライバシーポリシー";
const TERMS = "利用規約";

const AppFooter = (): ReactNode => (
  <footer className="bg-dc-rail text-dc-muted border-dc-line border-t py-6 text-xs">
    <div className="mx-auto flex w-full max-w-3xl flex-wrap gap-x-6 gap-y-2 px-5 font-bold">
      <span>{SITE_HOST}</span>
      <a href={PRIVACY_PATH} className="hover:text-dc-text">
        {PRIVACY}
      </a>
      <a href={TERMS_PATH} className="hover:text-dc-text">
        {TERMS}
      </a>
    </div>
  </footer>
);

export { AppFooter };
