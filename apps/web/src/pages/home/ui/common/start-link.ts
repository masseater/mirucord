import { DASHBOARD_PATH } from "#/shared/config";

export type ActionLink = Readonly<{ href: string; label: string }>;

export const START_LINK: ActionLink = {
  href: DASHBOARD_PATH,
  label: "Discord でログインしてはじめる",
};
