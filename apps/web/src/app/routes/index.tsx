import { createFileRoute } from "@tanstack/react-router";

import { HomePage, loadHomePage } from "#/pages/home";
import { SITE_ORIGIN } from "#/shared/config";

const TITLE = "mirucord | Discord を読む MCP サーバー";
const DESCRIPTION =
  "Discord サーバーの過去の会話を AI から探せる読み取り専用の MCP サーバーです。Bot を招待するだけで使えます。";
const FONTS_ORIGIN = "https://fonts.googleapis.com";
const FONTS_STATIC_ORIGIN = "https://fonts.gstatic.com";
const FONTS_URL = `${FONTS_ORIGIN}/css2?family=JetBrains+Mono:wght@400;500&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Zen+Old+Mincho:wght@500;700;900&display=swap`;

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
    links: [
      { rel: "canonical", href: SITE_ORIGIN },
      { rel: "preconnect", href: FONTS_ORIGIN },
      { rel: "preconnect", href: FONTS_STATIC_ORIGIN, crossOrigin: "anonymous" },
      { rel: "stylesheet", href: FONTS_URL },
    ],
  }),
  component: HomePage,
});

export { Route };
