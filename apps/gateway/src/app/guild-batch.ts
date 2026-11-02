import type { GatewayJob } from "@repo/ingest-util-gateway-contract";
import { Array, pipe, Record } from "effect";

const CHANGES_PER_JOB = 100;

type Batched = Extract<GatewayJob, Readonly<{ changes: readonly unknown[] }>> &
  Readonly<{ guildId: string }>;

type ChangeOf<Job extends Batched> = Job["changes"][number];

type Batching<Job extends Batched> = Readonly<{
  isBatch: (job: GatewayJob) => job is Job;
  rebuild: (guildId: string, changes: Array.NonEmptyReadonlyArray<ChangeOf<Job>>) => GatewayJob;
}>;

const mergeByGuild =
  <Job extends Batched>({ isBatch, rebuild }: Batching<Job>) =>
  (jobs: readonly GatewayJob[]): readonly GatewayJob[] => {
    const byGuild = Array.groupBy(pipe(jobs, Array.filter(isBatch)), ({ guildId }) => guildId);
    return pipe(
      Record.toEntries(byGuild),
      Array.flatMap(([guildId, guildJobs]) =>
        pipe(
          guildJobs,
          Array.flatMap((job): readonly ChangeOf<Job>[] => job.changes),
          Array.chunksOf(CHANGES_PER_JOB),
          Array.map((chunk) => rebuild(guildId, chunk)),
        ),
      ),
    );
  };

export { mergeByGuild };
export type { Batched, Batching, ChangeOf };
