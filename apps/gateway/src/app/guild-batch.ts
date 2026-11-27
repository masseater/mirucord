import type { GatewayJob } from "@repo/ingest-util-gateway-contract";
import { Array, Function, pipe, Record } from "effect";

const CHANGES_PER_JOB = 100;

export type Batched = Extract<GatewayJob, Readonly<{ changes: readonly unknown[] }>> &
  Readonly<{ guildId: string }>;

export type ChangeOf<Job extends Batched> = Job["changes"][number];

export type Batching<Job extends Batched> = Readonly<{
  isBatch: (job: GatewayJob) => job is Job;
  rebuild: (guildId: string, changes: Array.NonEmptyReadonlyArray<ChangeOf<Job>>) => GatewayJob;
}>;

const DATA_FIRST_ARITY = 2;

const latestByDataFirst = <Item>(
  items: readonly Item[],
  keyOf: (item: Item) => string,
): readonly Item[] => [
  ...new Map(
    pipe(
      items,
      Array.map((item) => [keyOf(item), item] as const),
    ),
  ).values(),
];

export const latestBy: {
  <Item>(keyOf: (item: Item) => string): (items: readonly Item[]) => readonly Item[];
  <Item>(items: readonly Item[], keyOf: (item: Item) => string): readonly Item[];
} = Function.dual(DATA_FIRST_ARITY, latestByDataFirst);

export const mergeGrouped = <Item>({
  items,
  groupKey,
  build,
}: Readonly<{
  items: readonly Item[];
  groupKey: (item: Item) => string;
  build: (group: Array.NonEmptyReadonlyArray<Item>) => readonly GatewayJob[];
}>): readonly GatewayJob[] =>
  pipe(Array.groupBy(items, groupKey), Record.values, Array.flatMap(build));

export const mergeByGuild =
  <Job extends Batched>({ isBatch, rebuild }: Batching<Job>) =>
  (jobs: readonly GatewayJob[]): readonly GatewayJob[] =>
    mergeGrouped({
      items: pipe(jobs, Array.filter(isBatch)),
      groupKey: ({ guildId }) => guildId,
      build: (group) =>
        pipe(
          group,
          Array.flatMap((job): readonly ChangeOf<Job>[] => job.changes),
          Array.chunksOf(CHANGES_PER_JOB),
          Array.map((chunk) => rebuild(Array.headNonEmpty(group).guildId, chunk)),
        ),
    });
