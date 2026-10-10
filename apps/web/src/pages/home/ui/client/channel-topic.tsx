import type { ReactNode } from "react";

const ChannelTopic = ({ topic }: Readonly<{ topic: string }>): ReactNode => (
  <span className="text-dc-muted border-dc-line ml-2 hidden truncate border-l pl-3 text-sm sm:block">
    {topic}
  </span>
);

export { ChannelTopic };
