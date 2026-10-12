import { R2, Workers } from "alchemy/Cloudflare";
import { Effect } from "effect";

export const r2BenchWorker = Effect.fn("r2BenchWorker")(function* r2BenchWorker(name: string) {
  const APAC = yield* R2.Bucket("R2BenchApac", {
    name: `${name}-apac`,
    locationHint: "apac",
    forceDestroy: true,
  });
  const ENAM = yield* R2.Bucket("R2BenchEnam", {
    name: `${name}-enam`,
    locationHint: "enam",
    forceDestroy: true,
  });
  return yield* Workers.Worker("R2Bench", {
    name,
    main: "./r2-bench.worker.ts",
    domain: `${name}.masseater.dev`,
    env: { R2BENCH_APAC: APAC, R2BENCH_ENAM: ENAM },
    observability: { enabled: true },
  });
});
