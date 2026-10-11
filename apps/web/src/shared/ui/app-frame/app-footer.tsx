import type { ReactNode } from "react";

import { PRIVACY_PATH, SELF_HOST_PATH, SITE_HOST, TECH_PATH, TERMS_PATH } from "#/shared/config";

const PRIVACY = "プライバシーポリシー";
const TERMS = "利用規約";
const TECH = "技術の話";
const SELF_HOST = "セルフホスト";

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
      <a href={TECH_PATH} className="hover:text-dc-text">
        {TECH}
      </a>
      <a href={SELF_HOST_PATH} className="hover:text-dc-text">
        {SELF_HOST}
      </a>
    </div>
  </footer>
);

export { AppFooter };
