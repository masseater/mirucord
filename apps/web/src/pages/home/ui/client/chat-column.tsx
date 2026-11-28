import type { ReactNode } from "react";

import { SERVICE_NAME } from "#/shared/config";
import { Footer } from "#/shared/ui/footer";

import { ChatHeader } from "./chat-header.tsx";
import { Composer } from "./composer.tsx";
import { MobileChannels } from "./mobile-channels.tsx";

const NOTICE = `Discord は Discord Inc. の商標です。${SERVICE_NAME} は Discord Inc. とは関係ありません。`;

export const ChatColumn = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="bg-dc-chat flex min-w-0 grow flex-col">
    <MobileChannels />
    <ChatHeader />
    <main className="grow">{children}</main>
    <Composer />
    <Footer layout="chat">
      <span>{NOTICE}</span>
    </Footer>
  </div>
);
