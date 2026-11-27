import { useSuspenseQuery } from "@tanstack/react-query";
import { Match } from "effect";
import type { ReactNode } from "react";
import { siDiscord } from "simple-icons";

import { inviteQuery } from "#/pages/home/api/invite";
import { BrandMark } from "#/pages/home/ui/common/brand-mark";
import { MASCOT_NAME } from "#/shared/config";
import { IconLine } from "#/shared/ui/icon-line";
import { PopButton } from "#/shared/ui/pop-button";

const LABEL = `${MASCOT_NAME}をサーバーに招待`;
const FULL = "招待の受付を締め切りました";

export const InviteChip = (): ReactNode => {
  const { data } = useSuspenseQuery(inviteQuery);
  return Match.value(data).pipe(
    Match.discriminatorsExhaustive("status")({
      open: ({ url }) => (
        <PopButton href={url} tone="primary" size="sm">
          <BrandMark path={siDiscord.path} size="20" className="fill-dc-bright" />
          {LABEL}
        </PopButton>
      ),
      full: () => (
        <IconLine icon="lock" role="alert" size="sm">
          {FULL}
        </IconLine>
      ),
    }),
  );
};
