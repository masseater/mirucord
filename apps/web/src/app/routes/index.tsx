import { createFileRoute } from "@tanstack/react-router";

import { HomePage, loadHomePage } from "#/pages/home";
import { SITE_ORIGIN } from "#/shared/config";

const TITLE = "mirucord | Discord の思い出をミルと見つけよう";
const DESCRIPTION =
  "Discord サーバーの昔の会話や名場面をミルがさがしてきます。Bot を招待するだけで使えます。";

const Route = createFileRoute("/")({
  loader: ({ context }) => loadHomePage(context.queryClient),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:locale", content: "ja_JP" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: SITE_ORIGIN }],
  }),
  component: HomePage,
});

export { Route };
