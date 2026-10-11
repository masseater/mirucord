import { Match } from "effect";
import type { ReactNode } from "react";

import { PLACES } from "#/pages/home/ui/common/places";
import { Mascot } from "#/shared/brand";

import { ChannelLink } from "./channel-link";
import { PageLink } from "./page-link";
import { PlainRow } from "./plain-row";
import type { SidebarRow } from "./sidebar-categories";

const SidebarRowView = ({ row }: Readonly<{ row: SidebarRow }>): ReactNode =>
  Match.value(row).pipe(
    Match.discriminatorsExhaustive("type")({
      link: ({ channel }) => (
        <ChannelLink id={channel.id} name={channel.name} kind={channel.kind} />
      ),
      page: ({ page }) => <PageLink href={page.href} name={page.name} kind={page.kind} />,
      peek: ({ id, activity }) => (
        <PlainRow place={PLACES[id]} activity={activity} peek={id} className="ch-peek">
          <Mascot className="ch-peek-miru absolute right-1 size-6" />
        </PlainRow>
      ),
      idle: ({ place, activity }) => <PlainRow place={place} activity={activity} />,
    }),
  );

export { SidebarRowView };
