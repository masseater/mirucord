import { env } from "cloudflare:workers";
import { OAuth2Routes, OAuth2Scopes, PermissionFlagsBits } from "discord-api-types/v10";

const BOT_PERMISSIONS =
  PermissionFlagsBits.ViewChannel +
  PermissionFlagsBits.ReadMessageHistory +
  PermissionFlagsBits.SendMessages;

const botInviteUrl = (): string => {
  const url = new URL(OAuth2Routes.authorizationURL);
  url.searchParams.set("client_id", env.DISCORD_CLIENT_ID);
  url.searchParams.set("scope", OAuth2Scopes.Bot);
  url.searchParams.set("permissions", BOT_PERMISSIONS.toString());
  return url.href;
};

export { botInviteUrl };
