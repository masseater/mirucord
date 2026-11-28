import type { ReactNode } from "react";

import { ChatHeader } from "./chat-header.tsx";
import { Composer } from "./composer.tsx";
import { MobileChannels } from "./mobile-channels.tsx";
import { SiteFooter } from "./site-footer.tsx";

export const ChatColumn = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="bg-dc-chat flex min-w-0 grow flex-col">
    <MobileChannels />
    <ChatHeader />
    <main className="grow">{children}</main>
    <Composer />
    <SiteFooter />
  </div>
);
