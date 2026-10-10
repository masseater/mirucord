import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";

import { RootDocument } from "#/app/shell/root-document";

import appCss from "#/app/styles.css?url";

const FONTS_ORIGIN = "https://fonts.googleapis.com";
const FONTS_STATIC_ORIGIN = "https://fonts.gstatic.com";
const FONTS_URL = `${FONTS_ORIGIN}/css2?family=JetBrains+Mono:wght@400;500&family=Zen+Maru+Gothic:wght@500;700;900&display=swap`;

const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "color-scheme", content: "light dark" },
      { title: "mirucord" },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: FONTS_ORIGIN },
      { rel: "preconnect", href: FONTS_STATIC_ORIGIN, crossOrigin: "anonymous" },
      { rel: "stylesheet", href: FONTS_URL },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootDocument,
});

export { Route };
