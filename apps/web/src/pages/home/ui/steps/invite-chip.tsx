import { useSuspenseQuery } from "@tanstack/react-query";
import { Match } from "effect";
import type { ReactNode } from "react";

import { inviteQuery } from "#/pages/home/api/invite";
import { DcLink } from "#/pages/home/ui/common/dc-link";
import { DiscordMark } from "#/pages/home/ui/common/discord-mark";
import { MASCOT_NAME } from "#/shared/config";
import { IconLine } from "#/shared/ui/icon-line";

const LABEL = `${MASCOT_NAME}をサーバーに招待`;
const FULL = "招待の受付を締め切りました";

const InviteChip = (): ReactNode => {
  const { data } = useSuspenseQuery(inviteQuery);
  return Match.value(data).pipe(
    Match.discriminatorsExhaustive("status")({
      open: ({ url }) => (
        <DcLink href={url} tone="primary">
          <DiscordMark size="20" className="fill-dc-bright" />
          {LABEL}
        </DcLink>
      ),
      full: () => (
        <IconLine icon="lock" role="alert" size="sm">
          {FULL}
        </IconLine>
      ),
    }),
  );
};

export { InviteChip };
