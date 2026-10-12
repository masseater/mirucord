import { Array, Match } from "effect";
import type { ReactNode } from "react";

import type { GuildListing } from "#/pages/dashboard/api/dashboard.server";
import { fixable } from "#/pages/dashboard/lib/feedback";

import { FeedbackLine } from "./feedback-line";
import { ReadableGuildList } from "./readable-guild-list";
import { ReadableGuildSection } from "./readable-guild-section";

const UNAVAILABLE = fixable("refresh")("サーバーを読み込めませんでした");

const ReadableGuildPanel = ({ listing }: Readonly<{ listing: GuildListing }>): ReactNode =>
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

export { ReadableGuildPanel };
