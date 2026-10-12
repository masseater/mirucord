import type { ReactNode } from "react";

const ChannelSection = ({
  id,
  children,
}: Readonly<{ id: string; children: ReactNode }>): ReactNode => (
  <section id={id} className="ch-section">
    <div className="ch-pane pb-10">{children}</div>
  </section>
);

export { ChannelSection };
