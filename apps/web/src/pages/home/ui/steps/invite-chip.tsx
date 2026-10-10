import { useSuspenseQuery } from "@tanstack/react-query";
import { Match } from "effect";
import type { ReactNode } from "react";

import { inviteQuery } from "#/pages/home/api/invite";
import { DcLink } from "#/pages/home/ui/common/dc-link";
import { DiscordMark } from "#/pages/home/ui/common/discord-mark";

const LABEL = "サーバーに追加する";
const FULL = "現在は登録できるサーバー数の上限に達しています。しばらくしてからお試しください。";

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
        <p role="alert" className="text-sm">
          {FULL}
        </p>
      ),
    }),
  );
};

export { InviteChip };
