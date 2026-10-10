import { createFileRoute } from "@tanstack/react-router";

import { GuildSettingsPage, guildPageQuery } from "#/pages/dashboard";

const Route = createFileRoute("/dashboard/$guildId")({
  loader: ({ context, params }) => context.queryClient.query(guildPageQuery(params.guildId)),
  head: () => ({ meta: [{ title: "サーバーの設定 | mirucord" }] }),
  component: GuildSettingsPage,
});

export { Route };
