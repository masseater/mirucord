import { createFileRoute } from "@tanstack/react-router";

import { GuildSettingsPage, guildPageQuery } from "#/pages/dashboard";
import { SERVICE_NAME } from "#/shared/config";

const Route = createFileRoute("/dashboard/$guildId")({
  loader: ({ context, params }) => context.queryClient.query(guildPageQuery(params.guildId)),
  head: () => ({ meta: [{ title: `サーバーの設定 | ${SERVICE_NAME}` }] }),
  component: GuildSettingsPage,
});

export { Route };
