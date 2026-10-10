import type { ReactNode } from "react";

import { ChannelSidebar } from "./channel-sidebar";
import { ChatColumn } from "./chat-column";
import { TitleBar } from "./title-bar";

const ClientFrame = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="ch-scope bg-dc-rail text-dc-text min-h-dvh font-sans antialiased scheme-dark">
    <TitleBar />
    <div className="flex">
      <ChannelSidebar />
      <ChatColumn>{children}</ChatColumn>
    </div>
  </div>
);

export { ClientFrame };
