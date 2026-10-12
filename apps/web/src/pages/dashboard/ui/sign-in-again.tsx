import { useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { DiscordSignIn } from "#/features/sign-in";

const SignInAgain = (): ReactNode => {
  const pathname = useLocation({ select: (location) => location.pathname });
  return <DiscordSignIn callbackURL={pathname} />;
};

export { SignInAgain };
