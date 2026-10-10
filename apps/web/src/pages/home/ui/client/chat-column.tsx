import type { ReactNode } from "react";

import { Composer } from "./composer";
import { MobileChannels } from "./mobile-channels";
import { SiteFooter } from "./site-footer";

const ChatColumn = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="bg-dc-chat flex min-w-0 grow flex-col">
    <MobileChannels />
    <main className="grow">{children}</main>
    <Composer />
    <SiteFooter />
  </div>
);

export { ChatColumn };
