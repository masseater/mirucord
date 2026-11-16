import { run } from "@r_masseater/workers-tracing/effect";
import { queryOptions } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { invite } from "./invite.server";
import type { Invite } from "./invite.server";

const getInvite = createServerFn({ method: "GET" }).handler(() => run(invite));

export const inviteQuery = queryOptions({
  queryKey: ["invite"],
  queryFn: () => getInvite(),
});

export const loadHomePage = (queryClient: QueryClient): Promise<Invite> =>
  queryClient.query(inviteQuery);
