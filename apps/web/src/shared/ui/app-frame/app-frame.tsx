import type { ReactNode } from "react";

import { DASHBOARD_NAME, DASHBOARD_PATH } from "#/shared/config";
import { Footer } from "#/shared/ui/footer";
import { Header } from "#/shared/ui/header";

import { BrandLink } from "./brand-link.tsx";

export const AppFrame = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="bg-dc-chat text-dc-text flex min-h-dvh flex-col font-sans antialiased scheme-dark">
    <Header layout="page">
      <BrandLink />
      <a
        href={DASHBOARD_PATH}
        className="text-dc-muted hover:text-dc-bright text-sm font-bold no-underline"
      >
        {DASHBOARD_NAME}
      </a>
    </Header>
    <main className="mx-auto flex w-full max-w-3xl grow flex-col gap-8 px-5 pt-8 pb-20">
      {children}
    </main>
    <Footer layout="page" />
  </div>
);
