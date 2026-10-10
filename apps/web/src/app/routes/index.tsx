import { createFileRoute } from "@tanstack/react-router";

import { HomePage, loadHomePage } from "#/pages/home";
import { SITE_ORIGIN } from "#/shared/config";

const TITLE = "mirucord | Discord の思い出を AI と掘り起こそう";
const DESCRIPTION =
  "Discord サーバーの昔の会話や名場面を AI と一緒に探せます。Bot を招待するだけで使えます。";
const FONTS_ORIGIN = "https://fonts.googleapis.com";
const FONTS_STATIC_ORIGIN = "https://fonts.gstatic.com";
const FONTS_URL = `${FONTS_ORIGIN}/css2?family=JetBrains+Mono:wght@400;500&family=Zen+Maru+Gothic:wght@500;700;900&display=swap`;

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
