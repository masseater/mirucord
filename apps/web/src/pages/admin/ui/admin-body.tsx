import { useSuspenseQuery } from "@tanstack/react-query";
import { Match } from "effect";
import type { ReactNode } from "react";

import { adminOverviewQuery } from "#/pages/admin/api/overview";

import { GuildTable } from "./guild-table";
import { SignInPrompt } from "./sign-in-prompt";

const FORBIDDEN = "This page is only for mirucord operators.";
const SERVERS = "Servers";

const AdminBody = (): ReactNode => {
  const { data } = useSuspenseQuery(adminOverviewQuery);
  return Match.value(data).pipe(
    Match.discriminatorsExhaustive("status")({
      "signed-out": () => <SignInPrompt />,
      forbidden: () => <p role="alert">{FORBIDDEN}</p>,
      ok: ({ guilds, limit }) => (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{`${SERVERS} ${guilds.length}/${limit}`}</h2>
          <GuildTable guilds={guilds} />
        </section>
      ),
    }),
  );
};

export { AdminBody };
