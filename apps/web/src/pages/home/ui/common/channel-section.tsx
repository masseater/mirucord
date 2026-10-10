import type { ReactNode } from "react";

import { ChannelHeader } from "./channel-header";
import type { ChannelKind } from "./channel-icon";

const ChannelSection = ({
  id,
  name,
  kind = "text",
  topic = "",
  children,
}: Readonly<{
  id: string;
  name: string;
  kind?: ChannelKind;
  topic?: string;
  children: ReactNode;
}>): ReactNode => (
  <section id={id} className="ch-section">
    <div className="ch-pane pb-10">
      <ChannelHeader name={name} kind={kind} topic={topic} />
      {children}
    </div>
  </section>
);

export { ChannelSection };
