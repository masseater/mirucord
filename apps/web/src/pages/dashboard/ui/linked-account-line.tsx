import type { ReactNode } from "react";

import type { PublicConnection } from "#/shared/discord/index.server";
import { IconLine } from "#/shared/ui/icon-line";

import { Pill } from "./pill";

const VERIFIED = "確認済み";

const LinkedAccountLine = ({
  connection,
}: Readonly<{ connection: PublicConnection }>): ReactNode => (
  <span className="flex flex-wrap items-center gap-2">
    <Pill tone="bg-lavender">{connection.type}</Pill>
    <span className="font-bold">{connection.name}</span>
    {connection.verified && (
      <IconLine icon="done" tone="muted" size="xs">
        {VERIFIED}
      </IconLine>
    )}
  </span>
);

export { LinkedAccountLine };
