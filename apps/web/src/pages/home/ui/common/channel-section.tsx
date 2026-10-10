import type { ReactNode } from "react";

import type { ChannelKind } from "#/shared/ui/channel-icon";

import { ChannelHeader } from "./channel-header";

const ChannelSection = ({
  id,
  name,
  kind = "text",
  children,
}: Readonly<{ id: string; name: string; kind?: ChannelKind; children: ReactNode }>): ReactNode => (
  <section id={id} className="ch-section pb-10">
    <ChannelHeader name={name} kind={kind} />
    {children}
  </section>
);

export { ChannelSection };
