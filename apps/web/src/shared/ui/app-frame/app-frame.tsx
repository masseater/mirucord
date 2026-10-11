import type { ReactNode } from "react";

import { AppFooter } from "./app-footer";
import { AppHeader } from "./app-header";

const AppFrame = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="bg-dc-chat text-dc-text flex min-h-dvh flex-col font-sans antialiased scheme-dark">
    <AppHeader />
    <main className="mx-auto flex w-full max-w-3xl grow flex-col gap-8 px-5 pt-8 pb-20">
      {children}
    </main>
    <AppFooter />
  </div>
);

export { AppFrame };
