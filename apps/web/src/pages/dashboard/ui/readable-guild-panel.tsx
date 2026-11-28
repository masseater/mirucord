import { Array, Match } from "effect";
import type { ReactNode } from "react";

import type { GuildListing } from "#/pages/dashboard/api/dashboard.server";
import { fixable } from "#/pages/dashboard/lib/feedback";

import { FeedbackLine } from "./feedback-line.tsx";
import { GuildItems } from "./guild-items.tsx";
import { ReadableGuildRow } from "./readable-guild-row.tsx";
import { ReadableGuildSection } from "./readable-guild-section.tsx";

const UNAVAILABLE = fixable("refresh")("サーバーを読み込めませんでした");

export const ReadableGuildPanel = ({ listing }: Readonly<{ listing: GuildListing }>): ReactNode =>
  Match.value(listing).pipe(
    Match.discriminatorsExhaustive("status")({
      unavailable: () => (
        <ReadableGuildSection>
          <FeedbackLine feedback={UNAVAILABLE} />
        </ReadableGuildSection>
      ),
      ready: ({ guilds }) =>
        Array.isReadonlyArrayNonEmpty(guilds) && (
          <ReadableGuildSection>
            <GuildItems
              guilds={guilds}
              className="grid items-start gap-3 sm:grid-cols-2"
              item={ReadableGuildRow}
            />
          </ReadableGuildSection>
        ),
    }),
  );
