import { Array, Match } from "effect";
import type { ReactNode } from "react";

import type { GuildListing } from "#/pages/dashboard/api/dashboard.server";
import { fixable } from "#/pages/dashboard/lib/feedback";

import { FeedbackLine } from "./feedback-line.tsx";
import { ReadableGuildList } from "./readable-guild-list.tsx";
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
            <ReadableGuildList guilds={guilds} />
          </ReadableGuildSection>
        ),
    }),
  );
