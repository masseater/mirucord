import type { ReactNode } from "react";

import { LegalLinks } from "#/shared/ui/legal-links";

export const AppFooter = (): ReactNode => (
  <footer className="bg-dc-rail text-dc-muted border-dc-line border-t py-6 text-xs">
    <div className="mx-auto flex w-full max-w-3xl flex-wrap gap-x-6 gap-y-2 px-5">
      <LegalLinks />
    </div>
  </footer>
);
