import { queryOptions } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { inviteUrl } from "./invite.server";

const getInviteUrl = createServerFn({ method: "GET" }).handler(() => inviteUrl());

const inviteUrlQuery = queryOptions({
  queryKey: ["invite-url"],
  queryFn: () => getInviteUrl(),
  staleTime: "static",
});

const loadHomePage = (queryClient: QueryClient): Promise<string> =>
  queryClient.query(inviteUrlQuery);

export { inviteUrlQuery, loadHomePage };
