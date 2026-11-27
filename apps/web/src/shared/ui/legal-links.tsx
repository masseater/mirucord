import type { ReactNode } from "react";

import { PRIVACY_PATH, SITE_HOST, TERMS_PATH } from "#/shared/config";

const PRIVACY = "プライバシーポリシー";
const TERMS = "利用規約";

export const LegalLinks = (): ReactNode => (
  <>
    <span className="font-bold">{SITE_HOST}</span>
    <a href={PRIVACY_PATH} className="hover:text-dc-text font-bold">
      {PRIVACY}
    </a>
    <a href={TERMS_PATH} className="hover:text-dc-text font-bold">
      {TERMS}
    </a>
  </>
);
