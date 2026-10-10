import type { ReactNode } from "react";

import { ChannelHeader } from "./channel-header";

const ChannelSection = ({
  id,
  name,
  children,
}: Readonly<{ id: string; name: string; children: ReactNode }>): ReactNode => (
  <section id={id} className="pb-10">
    <ChannelHeader name={name} />
    {children}
  </section>
);

export { ChannelSection };
