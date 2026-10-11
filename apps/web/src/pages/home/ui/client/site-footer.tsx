import type { ReactNode } from "react";

import { PRIVACY_PATH, SITE_HOST, TERMS_PATH } from "#/shared/config";

const PRIVACY = "プライバシーポリシー";
const TERMS = "利用規約";
const NOTICE = "Discord は Discord Inc. の商標です。mirucord は Discord Inc. とは関係ありません。";

const SiteFooter = (): ReactNode => (
  <footer className="bg-dc-chat text-dc-muted border-dc-line flex flex-wrap gap-x-6 gap-y-2 border-t px-4 py-6 text-xs">
    <span className="font-bold">{SITE_HOST}</span>
    <a href={PRIVACY_PATH} className="hover:text-dc-text font-bold">
      {PRIVACY}
    </a>
    <a href={TERMS_PATH} className="hover:text-dc-text font-bold">
      {TERMS}
    </a>
    <span>{NOTICE}</span>
  </footer>
);

export { SiteFooter };
