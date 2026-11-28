import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";
import { LegalLinks } from "#/shared/ui/legal-links";

const LAYOUT = {
  page: { frame: "bg-dc-rail py-6", links: "mx-auto w-full max-w-3xl px-5" },
  chat: { frame: "bg-dc-chat px-4 py-6", links: "" },
} as const;

export type FooterProps = Readonly<{
  layout: keyof typeof LAYOUT;
  children?: ReactNode;
}>;

export const Footer = ({ layout, children }: FooterProps): ReactNode => (
  <footer className={cn("text-dc-muted border-dc-line border-t text-xs", LAYOUT[layout].frame)}>
    <div className={cn("flex flex-wrap gap-x-6 gap-y-2", LAYOUT[layout].links)}>
      <LegalLinks />
      {children}
    </div>
  </footer>
);
