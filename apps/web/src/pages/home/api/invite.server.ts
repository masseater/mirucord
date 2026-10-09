import { env } from "cloudflare:workers";

const AUTHORIZE_URL = "https://discord.com/oauth2/authorize";
const BOT_PERMISSIONS = "66560";

const inviteUrl = (): string => {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", env.DISCORD_CLIENT_ID);
  url.searchParams.set("scope", "bot");
  url.searchParams.set("permissions", BOT_PERMISSIONS);
  return url.href;
};

export { inviteUrl };
