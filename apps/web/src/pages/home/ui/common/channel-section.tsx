import type { ReactNode } from "react";

import { ChannelHeader } from "./channel-header";
import type { ChannelKind } from "./channel-icon";

const ChannelSection = ({
  id,
  name,
  kind = "text",
  children,
}: Readonly<{ id: string; name: string; kind?: ChannelKind; children: ReactNode }>): ReactNode => (
  <section id={id} className="pb-10">
    <ChannelHeader name={name} kind={kind} />
    {children}
  </section>
);

export { ChannelSection };
