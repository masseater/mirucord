import { CredentialsFromEnv } from "@distilled.cloud/fly-io";
import { listMachines, patchMachineMetadata } from "@distilled.cloud/fly-io/machines";
import { Array as Arr, Effect, Option } from "effect";
import { FetchHttpClient } from "effect/http";

const STACK_KEY = "alchemy.stack";
const STAGE_KEY = "alchemy.stage";
const ID_KEY = "alchemy.id";

type Relabel = Readonly<{ app: string; from: string; to: string; stage: string; id: string }>;

const machineIdsLabelled = Effect.fn("machineIdsLabelled")(function* machineIdsLabelled(
  relabel: Relabel,
  stack: string,
) {
  const listed = yield* listMachines({ app_name: relabel.app });
  return listed.flatMap((machine) => {
    const metadata: Readonly<Record<string, string | undefined>> = Option.fromNullishOr(
      machine.config,
    ).pipe(
      Option.flatMapNullishOr((config) => config.metadata),
      Option.getOrElse(() => ({})),
    );
    const matches =
      metadata[STACK_KEY] === stack &&
      metadata[STAGE_KEY] === relabel.stage &&
      metadata[ID_KEY] === relabel.id;
    return Option.toArray(Option.filter(Option.fromNullishOr(machine.id), () => matches));
  });
});

const relabelMachines = Effect.fn("relabelMachines")(
  function* relabelMachines(relabel: Relabel) {
    const stale = yield* machineIdsLabelled(relabel, relabel.from);
    yield* Effect.forEach(
      stale,
      (machineId) =>
        patchMachineMetadata({
          app_name: relabel.app,
          machine_id: machineId,
          metadata: { [STACK_KEY]: relabel.to },
        }),
      { discard: true },
    );
    const remaining = yield* machineIdsLabelled(relabel, relabel.from);
    const relabelled = yield* machineIdsLabelled(relabel, relabel.to);
    if (Arr.isReadonlyArrayNonEmpty(remaining) || !Arr.isReadonlyArrayNonEmpty(relabelled)) {
      return yield* Effect.die(
        new Error(
          `${relabel.app} の ${relabel.id} のマシンを ${relabel.to} に付け替えられていない: 残り ${remaining.join(",")}、付け替え済み ${relabelled.join(",")}`,
        ),
      );
    }
    return { patched: stale, relabelled };
  },
  Effect.provide([CredentialsFromEnv, FetchHttpClient.layer]),
  Effect.orDie,
);

export type { Relabel };
export { relabelMachines };
