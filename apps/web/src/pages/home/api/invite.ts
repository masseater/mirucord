import { queryOptions } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { runRequest } from "#/shared/lib/index.server";

import { invite } from "./invite.server";
import type { Invite } from "./invite.server";

const getInvite = createServerFn({ method: "GET" }).handler(() => runRequest(invite));

const inviteQuery = queryOptions({
  queryKey: ["invite"],
  queryFn: () => getInvite(),
});

const loadHomePage = (queryClient: QueryClient): Promise<Invite> => queryClient.query(inviteQuery);

export { inviteQuery, loadHomePage };
