import { createFileRoute } from "@tanstack/react-router";

import { SignInPage } from "#/pages/sign-in";

const Route = createFileRoute("/sign-in")({ component: SignInPage });

export { Route };
