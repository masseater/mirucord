import { useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { DiscordSignIn } from "#/features/sign-in";

export const SignInAgain = (): ReactNode => {
  const pathname = useLocation({ select: (location) => location.pathname });
  return <DiscordSignIn callbackURL={pathname} />;
};
