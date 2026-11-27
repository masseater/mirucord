import type { ReactNode } from "react";

import { SERVICE_NAME } from "#/shared/config";
import { LegalLinks } from "#/shared/ui/legal-links";

const NOTICE = `Discord は Discord Inc. の商標です。${SERVICE_NAME} は Discord Inc. とは関係ありません。`;

export const SiteFooter = (): ReactNode => (
  <footer className="bg-dc-chat text-dc-muted border-dc-line flex flex-wrap gap-x-6 gap-y-2 border-t px-4 py-6 text-xs">
    <LegalLinks />
    <span>{NOTICE}</span>
  </footer>
);
