import type { ReactNode } from "react";

import type { ChannelKind } from "#/shared/discord";

import { ChannelHeader } from "./channel-header";

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
