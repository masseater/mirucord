import { Array, pipe } from "effect";

import type { ManagedGuild } from "#/features/ingest-messages/index.server";
import type { Dashboard } from "#/pages/dashboard/api/dashboard.server";

export type ReadyDashboard = Extract<Dashboard, Readonly<{ status: "ready" }>>;

export type ConsentStep =
  | Readonly<{ status: "awaiting"; guilds: readonly ManagedGuild[] }>
  | Readonly<{ status: "invite" }>
  | Readonly<{ status: "done" }>;

export type RegisterStep = Readonly<{ status: "todo" }> | Readonly<{ status: "done" }>;

export type NextSteps =
  | Readonly<{ status: "pending"; consent: ConsentStep; register: RegisterStep }>
  | Readonly<{ status: "finished" }>;

const canSearch = ({ guilds, readable }: ReadyDashboard): boolean =>
  (readable.status === "ready" && Array.isReadonlyArrayNonEmpty(readable.guilds)) ||
  pipe(
    guilds,
    Array.some(({ ingest }) => ingest !== "withdrawing"),
  );

const consentStepOf = (dashboard: ReadyDashboard): ConsentStep => {
  const awaiting = pipe(
    dashboard.guilds,
    Array.filter(({ ingest }) => ingest === "awaiting"),
  );
  if (Array.isReadonlyArrayNonEmpty(awaiting)) {
    return { status: "awaiting", guilds: awaiting };
  }
  if (canSearch(dashboard)) {
    return { status: "done" };
  }
  return { status: "invite" };
};

const registerStepOf = ({ apps }: ReadyDashboard): RegisterStep => {
  if (Array.isReadonlyArrayNonEmpty(apps)) {
    return { status: "done" };
  }
  return { status: "todo" };
};

export const nextStepsOf = (dashboard: ReadyDashboard): NextSteps => {
  const consent = consentStepOf(dashboard);
  const register = registerStepOf(dashboard);
  if (consent.status === "done" && register.status === "done") {
    return { status: "finished" };
  }
  return { status: "pending", consent, register };
};
