import { eq } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Option } from "effect";

import { FLUSH_DELAY_MS } from "#/entities/guild-message/lib/search-layout";
import { searchInvalid } from "#/entities/guild-message/model/search-segment.schema";

import { EARLIEST, recentOf, sealedOf, searchLedger } from "./search-ledger.server";
import type { Segment } from "./search-ledger.server";

type Flush = "due" | "now";

type RecentCheck = Readonly<{ db: DrizzleSqliteDODatabase; now: number; flush: Flush }>;

const hasInvalid = (db: DrizzleSqliteDODatabase, segment: Segment): boolean => {
  const found = db
    .select({ segment: searchInvalid.segment })
    .from(searchInvalid)
    .where(eq(searchInvalid.segment, segment.name))
    .get();
  return Option.isSome(Option.fromUndefinedOr(found));
};

const recentIsStale = (
  { db }: RecentCheck,
  recent: Option.Option<Segment>,
  sealedChanged: boolean,
): boolean => {
  const newest = searchLedger(db).latestPending(sealedOf(searchLedger(db).segments()));
  return (
    sealedChanged ||
    Option.match(recent, {
      onNone: () => newest > EARLIEST,
      onSome: (segment) => newest > segment.builtThrough || hasInvalid(db, segment),
    })
  );
};

const dueAt = (recent: Option.Option<Segment>): number =>
  Option.match(recent, {
    onNone: () => EARLIEST,
    onSome: ({ builtAt }) => builtAt + FLUSH_DELAY_MS,
  });

type RecentPlan = Readonly<{ rebuild: boolean; waitUntil: Option.Option<number> }>;

type PlanCheck = RecentCheck & Readonly<{ sealedChanged: boolean }>;

const mayWait = ({ flush, sealedChanged }: PlanCheck): boolean => flush === "due" && !sealedChanged;

const isWaiting = (check: PlanCheck, recent: Option.Option<Segment>): boolean =>
  mayWait(check) && check.now < dueAt(recent) && recentIsStale(check, recent, false);

const recentPlan = (check: PlanCheck): RecentPlan => {
  const recent = recentOf(searchLedger(check.db).segments());
  const waiting = isWaiting(check, recent);
  return {
    rebuild: !waiting && recentIsStale(check, recent, check.sealedChanged),
    waitUntil: Option.map(
      Option.liftPredicate(recent, () => waiting),
      () => dueAt(recent),
    ),
  };
};

export { recentPlan };
export type { Flush, PlanCheck, RecentCheck, RecentPlan };
