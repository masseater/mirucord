import type { ReactNode } from "react";

import { ChannelSidebar } from "./channel-sidebar";
import { ChatColumn } from "./chat-column";
import { MemberList } from "./member-list";
import { ServerRail } from "./server-rail";
import { TitleBar } from "./title-bar";

const ClientFrame = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="bg-dc-rail text-dc-text min-h-dvh font-sans antialiased scheme-dark">
    <TitleBar />
    <div className="flex">
      <ServerRail />
      <ChannelSidebar />
      <ChatColumn>{children}</ChatColumn>
      <MemberList />
    </div>
  </div>
);

export { ClientFrame };
