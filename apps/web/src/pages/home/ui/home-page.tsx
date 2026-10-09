import { useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { inviteUrlQuery } from "#/pages/home/api/invite";
import { MCP_URL } from "#/shared/config";

const TITLE = "mirucord";
const SUMMARY =
  "A read-only MCP server for Discord. Invite the bot to a server, add the MCP URL to your client, and sign in with Discord. You only see channels you can read on Discord.";
const INVITE_HEADING = "1. Invite the bot";
const INVITE_LINK = "Add mirucord to a Discord server";
const MCP_HEADING = "2. Add the MCP server";

const HomePage = (): ReactNode => {
  const { data: inviteUrl } = useSuspenseQuery(inviteUrlQuery);
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold">{TITLE}</h1>
      <p>{SUMMARY}</p>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{INVITE_HEADING}</h2>
        <a className="underline" href={inviteUrl}>
          {INVITE_LINK}
        </a>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{MCP_HEADING}</h2>
        <code className="bg-muted rounded p-2">{MCP_URL}</code>
      </section>
    </main>
  );
};

export { HomePage };
