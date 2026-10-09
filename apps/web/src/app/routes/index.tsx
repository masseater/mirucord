import { createFileRoute } from "@tanstack/react-router";

import { HomePage } from "#/pages/home";

const Route = createFileRoute("/")({ component: HomePage });

export { Route };
