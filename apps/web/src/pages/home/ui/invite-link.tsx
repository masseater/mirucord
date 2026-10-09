import { useSuspenseQuery } from "@tanstack/react-query";
import { Match } from "effect";
import type { ReactNode } from "react";

import { inviteQuery } from "#/pages/home/api/invite";

const INVITE_LINK = "Add mirucord to a Discord server";
const FULL =
  "mirucord has reached its server limit and cannot be added to new servers right now. Please try again later.";

const InviteLink = (): ReactNode => {
  const { data } = useSuspenseQuery(inviteQuery);
  return Match.value(data).pipe(
    Match.discriminatorsExhaustive("status")({
      open: ({ url }) => (
        <a className="underline" href={url}>
          {INVITE_LINK}
        </a>
      ),
      full: () => <p role="alert">{FULL}</p>,
    }),
  );
};

export { InviteLink };
