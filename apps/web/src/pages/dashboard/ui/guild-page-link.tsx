import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ReactNode } from "react";

const GuildPageLink = ({
  guildId,
  className,
  children,
}: Readonly<{ guildId: string; className: string; children: ReactNode }>): ReactNode => {
  const params = useMemo(() => ({ guildId }), [guildId]);
  return (
    <Link to="/dashboard/$guildId" params={params} className={className}>
      {children}
    </Link>
  );
};

export { GuildPageLink };
