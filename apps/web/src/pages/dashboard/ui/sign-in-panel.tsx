import type { ReactNode } from "react";

import { SignInPanel as DiscordSignInPanel } from "#/features/sign-in";

const TITLE = "管理画面";

export const SignInPanel = ({ returnTo }: Readonly<{ returnTo: string }>): ReactNode => (
  <DiscordSignInPanel title={TITLE} returnTo={returnTo} />
);
