import { useSuspenseQuery } from "@tanstack/react-query";
import { Match } from "effect";
import type { ReactNode } from "react";

import { inviteQuery } from "#/pages/home/api/invite";
import { DiscordMark } from "#/pages/home/ui/common/discord-mark";

const LABEL = "サーバーに追加する";
const FULL = "現在は登録できるサーバー数の上限に達しています。しばらくしてからお試しください。";

const InviteChip = (): ReactNode => {
  const { data } = useSuspenseQuery(inviteQuery);
  return Match.value(data).pipe(
    Match.discriminatorsExhaustive("status")({
      open: ({ url }) => (
        <a
          href={url}
          className="border-ink bg-lavender shadow-pop-sm inline-flex w-fit items-center gap-2.5 rounded-full border-2 px-5 py-2.5 text-sm font-bold no-underline motion-safe:transition-transform motion-safe:hover:-translate-y-0.5"
        >
          <DiscordMark size="20" className="fill-discord" />
          {LABEL}
        </a>
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
