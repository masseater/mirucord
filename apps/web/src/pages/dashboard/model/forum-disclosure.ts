import { useAtom } from "@effect/atom-react";
import { Atom } from "effect/reactivity";
import { useCallback } from "react";

type ForumDisclosure = Readonly<{ status: "closed" }> | Readonly<{ status: "open" }>;

const CLOSED: ForumDisclosure = { status: "closed" };
const OPEN: ForumDisclosure = { status: "open" };
const TOGGLED = { closed: OPEN, open: CLOSED } as const;

const forumDisclosureAtom = Atom.family((channelId: string) =>
  Atom.make<ForumDisclosure>(CLOSED).pipe(Atom.withLabel(`forum-disclosure:${channelId}`)),
);

const forumPostsId = (channelId: string): string => `forum-posts-${channelId}`;

const useForumDisclosure = (
  channelId: string,
): Readonly<{ disclosure: ForumDisclosure; toggle: () => void }> => {
  const [disclosure, setDisclosure] = useAtom(forumDisclosureAtom(channelId));
  const toggle = useCallback(() => {
    setDisclosure((current) => TOGGLED[current.status]);
  }, [setDisclosure]);
  return { disclosure, toggle };
};

export { forumPostsId, useForumDisclosure };
