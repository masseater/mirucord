import type { ReactNode } from "react";

import { SignInPanel as DiscordSignInPanel } from "#/features/sign-in";

const TIP = "サーバーの管理者さん向けだよ";
const TITLE = "ログインして管理画面へ";

const SignInPanel = ({ returnTo }: Readonly<{ returnTo: string }>): ReactNode => (
  <DiscordSignInPanel tip={TIP} title={TITLE} returnTo={returnTo} />
);

export { SignInPanel };
