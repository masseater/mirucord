import type { ReactNode } from "react";

import { PLACES } from "#/pages/home/ui/common/places";
import { Mascot } from "#/shared/brand";

import { ChannelLink } from "./channel-link";
import { PlainRow } from "./plain-row";
import type { SidebarRow } from "./sidebar-categories";

const SidebarItem = ({ row }: Readonly<{ row: SidebarRow }>): ReactNode => (
  <li>
    {row.type === "link" && (
      <ChannelLink id={row.channel.id} name={row.channel.name} kind={row.channel.kind} />
    )}
    {row.type === "peek" && (
      <PlainRow place={PLACES[row.id]} activity={row.activity} peek={row.id} className="ch-peek">
        <Mascot className="ch-peek-miru absolute right-1 size-6" />
      </PlainRow>
    )}
    {row.type === "idle" && <PlainRow place={row.place} activity={row.activity} />}
  </li>
);

export { SidebarItem };
