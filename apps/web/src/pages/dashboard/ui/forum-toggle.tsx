import { useAtom } from "@effect/atom-react";
import { Atom } from "effect/reactivity";
import { useCallback, useId } from "react";
import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";
import { cn } from "#/shared/lib/utils";

import { ChannelLabel } from "./channel-label";
import { ForumPostList } from "./forum-post-list";
import { IngestPill } from "./ingest-pill";

const POSTS = "投稿";
const UNIT = "件";
const CHEVRON = "▸";

type ForumDisclosure = Readonly<{ status: "closed" }> | Readonly<{ status: "open" }>;

const CLOSED: ForumDisclosure = { status: "closed" };
const OPEN: ForumDisclosure = { status: "open" };
const TOGGLED = { closed: OPEN, open: CLOSED } as const;

const forumDisclosureAtom = Atom.family((channelId: string) =>
  Atom.make<ForumDisclosure>(CLOSED).pipe(Atom.withLabel(`forum-disclosure:${channelId}`)),
);

type ForumChannel = Extract<SettingsChannel, Readonly<{ kind: "forum" }>>;

const ForumToggle = ({
  guildId,
  channel,
}: Readonly<{ guildId: string; channel: ForumChannel }>): ReactNode => {
  const listId = useId();
  const [disclosure, setDisclosure] = useAtom(forumDisclosureAtom(channel.id));
  const toggle = useCallback(() => {
    setDisclosure((current) => TOGGLED[current.status]);
  }, [setDisclosure]);
  return (
    <>
      <button
        type="button"
        aria-expanded={disclosure.status === "open"}
        aria-controls={listId}
        onClick={toggle}
        className="hover:text-grape flex cursor-pointer flex-wrap items-baseline gap-x-2 text-left"
      >
        <span
          aria-hidden="true"
          className={cn(
            "motion-safe:transition-transform",
            disclosure.status === "open" && "rotate-90",
          )}
        >
          {CHEVRON}
        </span>
        <ChannelLabel channel={channel} />
        <span className="text-ink-soft text-sm">
          {POSTS} {channel.posts.toLocaleString("ja-JP")} {UNIT}
        </span>
      </button>
      <IngestPill ingest={channel.ingest} />
      {disclosure.status === "open" && (
        <div id={listId} className="border-line basis-full border-l-2 py-1 pl-4">
          <ForumPostList guildId={guildId} channelId={channel.id} />
        </div>
      )}
    </>
  );
};

export { ForumToggle };
