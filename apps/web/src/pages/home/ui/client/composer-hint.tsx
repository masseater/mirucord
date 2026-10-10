import type { ReactNode } from "react";

import { CHANNELS } from "#/pages/home/ui/common/channels";

const SUFFIX = " へメッセージを送信";

const ComposerHint = (): ReactNode => (
  <span className="grid min-w-0">
    {CHANNELS.map((channel) => (
      <span
        key={channel.id}
        data-channel={channel.id}
        className="composer-hint col-start-1 row-start-1 truncate"
      >
        {`#${channel.name}${SUFFIX}`}
      </span>
    ))}
  </span>
);

export { ComposerHint };
