import { Array, pipe } from "effect";
import type { ComponentType, ReactNode } from "react";

export type GuildItemsProps<Guild extends Readonly<{ id: string }>> = Readonly<{
  guilds: readonly Guild[];
  className: string;
  item: ComponentType<Readonly<{ guild: Guild }>>;
}>;

export const GuildItems = <Guild extends Readonly<{ id: string }>>({
  guilds,
  className,
  item: Item,
}: GuildItemsProps<Guild>): ReactNode => (
  <ul className={className}>
    {pipe(
      guilds,
      Array.map((guild) => <Item key={guild.id} guild={guild} />),
    )}
  </ul>
);
