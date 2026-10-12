import { CDNRoutes, ImageFormat, RouteBases } from "discord-api-types/v10";
import { Array, Option } from "effect";
import type { ReactNode } from "react";

const ICON_SIZE = 96;

const iconUrl = (guildId: string, icon: string): string =>
  `${RouteBases.cdn}${CDNRoutes.guildIcon(guildId, icon, ImageFormat.WebP)}?size=${String(ICON_SIZE)}`;

const GuildIcon = ({
  guildId,
  name,
  icon,
}: Readonly<{ guildId: string; name: string; icon: string | null }>): ReactNode =>
  Option.match(Option.fromNullOr(icon), {
    onNone: () => (
      <span
        aria-hidden="true"
        className="bg-dc-active text-dc-bright grid size-10 shrink-0 place-items-center rounded-full text-sm font-black"
      >
        {Option.getOrElse(Array.head(Array.fromIterable(name)), () => "")}
      </span>
    ),
    onSome: (hash) => (
      <img
        src={iconUrl(guildId, hash)}
        alt=""
        width={ICON_SIZE}
        height={ICON_SIZE}
        loading="lazy"
        className="size-10 shrink-0 rounded-full"
      />
    ),
  });

export { GuildIcon };
