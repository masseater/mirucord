import { Array, Option, Schema } from "effect";

import type { Dashboard } from "#/pages/dashboard/api/dashboard.server";

const DashboardSearchSchema = Schema.Struct({ from: Schema.optional(Schema.Literal("signIn")) });

type DashboardSearch = typeof DashboardSearchSchema.Type;

type Landing =
  | Readonly<{ status: "stay" }>
  | Readonly<{ status: "tidy" }>
  | Readonly<{ status: "consent"; guildId: string }>;

const validateDashboardSearch = Schema.toStandardSchemaV1(DashboardSearchSchema);

const STAY: Landing = { status: "stay" };
const TIDY: Landing = { status: "tidy" };

const awaitingGuildOf = (dashboard: Dashboard): Option.Option<string> => {
  if (dashboard.status !== "ready") {
    return Option.none();
  }
  return Array.findFirst(dashboard.guilds, ({ ingest }) => ingest === "awaiting").pipe(
    Option.map(({ id }) => id),
  );
};

const landingOf = ({
  dashboard,
  search,
}: Readonly<{ dashboard: Dashboard; search: DashboardSearch }>): Landing => {
  if (search.from !== "signIn") {
    return STAY;
  }
  return Option.match(awaitingGuildOf(dashboard), {
    onNone: () => TIDY,
    onSome: (guildId): Landing => ({ status: "consent", guildId }),
  });
};

export { landingOf, validateDashboardSearch };
export type { Landing };
