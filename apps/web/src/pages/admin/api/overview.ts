import { queryOptions } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { runRequest } from "#/shared/lib/index.server";

import { adminOverview } from "./overview.server";
import type { AdminOverview } from "./overview.server";

const getAdminOverview = createServerFn({ method: "GET" }).handler(() => runRequest(adminOverview));

const adminOverviewQuery = queryOptions({
  queryKey: ["admin-overview"],
  queryFn: () => getAdminOverview(),
});

const loadAdminPage = (queryClient: QueryClient): Promise<AdminOverview> =>
  queryClient.query(adminOverviewQuery);

export { adminOverviewQuery, loadAdminPage };
