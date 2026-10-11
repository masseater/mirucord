import type { ReactNode } from "react";

import type { ManagedGuild } from "#/features/ingest/index.server";
import { popButtonVariants } from "#/shared/ui/pop-variants";

import { GuildPageLink } from "./guild-page-link";

const consentLabel = (name: string): string => `「${name}」で同意する`;

const WaitingGuildLink = ({ guild }: Readonly<{ guild: ManagedGuild }>): ReactNode => (
  <li>
    <GuildPageLink
      guildId={guild.id}
      className={popButtonVariants({ tone: "primary", size: "sm" })}
    >
      {consentLabel(guild.name)}
    </GuildPageLink>
  </li>
);

export { WaitingGuildLink };
