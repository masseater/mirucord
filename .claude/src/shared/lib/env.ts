import { runMainWith } from "@r_masseater/node-main";
import {
  Array as Arr,
  Config,
  Effect,
  FileSystem,
  Function as Fn,
  Layer,
  Path,
  Runtime,
  Schema,
  Stdio,
  Stream,
} from "effect";
import type { Option } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { HookPlatform } from "./platform.ts";
import type { CommandResult, Sink } from "./platform.ts";

const EXIT_SUCCESS = 0;
const EXIT_BLOCKING = 2;
const DATA_FIRST_ARITY = 2;

const taggedError = Schema.TaggedError;

class HookBlocked extends taggedError<HookBlocked, { readonly brand: unique symbol }>()(
  "HookBlocked",
  { message: Schema.String },
) {
  public override readonly [Runtime.errorExitCode] = EXIT_BLOCKING;
}

export const projectDir = Config.String("CLAUDE_PROJECT_DIR").pipe(Config.withDefault("."));

export const projectRoot = Effect.gen(function* projectRoot() {
  const platform = yield* HookPlatform;
  const dir = yield* projectDir;
  return platform.resolve(dir);
});

export const localBin = Effect.fn("localBin")(function* localBin(name: string) {
  const platform = yield* HookPlatform;
  const root = yield* projectRoot;
  return platform.join(root, "node_modules", ".bin", name);
});

export const blockWhen = (reasons: readonly string[]): Effect.Effect<void, HookBlocked> => {
  if (!Arr.isReadonlyArrayNonEmpty(reasons)) {
    return Effect.void;
  }
  return Effect.fail(HookBlocked.make({ message: Arr.join(reasons, "\n") }));
};

const writeTo = (sink: Sink, text: string): Effect.Effect<void, never, HookPlatform> =>
  Effect.gen(function* write() {
    const platform = yield* HookPlatform;
    yield* platform.write(sink, text);
  });

export const writeJson: {
  <Codec extends Schema.Top>(
    value: Codec["Type"],
  ): (schema: Codec) => Effect.Effect<void, never, HookPlatform | Codec["EncodingServices"]>;
  <Codec extends Schema.Top>(
    schema: Codec,
    value: Codec["Type"],
  ): Effect.Effect<void, never, HookPlatform | Codec["EncodingServices"]>;
} = Fn.dual(DATA_FIRST_ARITY, <Codec extends Schema.Top>(schema: Codec, value: Codec["Type"]) =>
  Schema.encodeEffect(Schema.fromJsonString(schema))(value).pipe(
    Effect.orDie,
    Effect.flatMap((text) => writeTo("stdout", text)),
  ),
);

export const readHookInput = <Codec extends Schema.Top>(
  schema: Codec,
): Effect.Effect<Codec["Type"], Schema.SchemaError, HookPlatform | Codec["DecodingServices"]> =>
  Effect.gen(function* read() {
    const platform = yield* HookPlatform;
    const text = yield* platform.readStdin;
    return yield* Schema.decodeEffect(Schema.fromJsonString(schema))(text);
  });

const spawnCommand = (
  command: string,
  args: readonly string[],
): Effect.Effect<CommandResult, never, ChildProcessSpawner.ChildProcessSpawner> =>
  Effect.gen(function* run() {
    const dir = yield* projectDir.pipe(Effect.orDie);
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const handle = yield* spawner.spawn(ChildProcess.make(command, args, { cwd: dir }));
    const [stdout, stderr, exitCode] = yield* Effect.all(
      [
        handle.stdout.pipe(Stream.decodeText, Stream.mkString),
        handle.stderr.pipe(Stream.decodeText, Stream.mkString),
        handle.exitCode,
      ],
      { concurrency: "unbounded" },
    );
    return { succeeded: exitCode === EXIT_SUCCESS, stdout, output: `${stdout}${stderr}` };
  }).pipe(
    Effect.scoped,
    Effect.catchTag("PlatformError", (failure) =>
      Effect.succeed({ succeeded: false, stdout: "", output: failure.message }),
    ),
  );

const platformLayer = Layer.effect(
  HookPlatform,
  Effect.gen(function* platform() {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const client = yield* HttpClient.HttpClient;
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const stdio = yield* Stdio.Stdio;
    return HookPlatform.of({
      runCommand: (command, args) =>
        spawnCommand(command, args).pipe(
          Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
        ),
      getJson: (url, schema) =>
        client
          .execute(HttpClientRequest.get(url, { acceptJson: true }))
          .pipe(
            Effect.flatMap(HttpClientResponse.filterStatusOk),
            Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)),
            Effect.option,
          ),
      readStdin: stdio.stdin.pipe(Stream.decodeText, Stream.mkString, Effect.orDie),
      write: (sink, text) => Stream.make(text).pipe(Stream.run(stdio[sink]()), Effect.orDie),
      exists: (file) => fs.exists(file).pipe(Effect.orDie),
      readFile: (file) => fs.readFileString(file).pipe(Effect.option),
      resolve: (...segments) => path.resolve(...segments),
      join: (...segments) => path.join(...segments),
      relative: (from, to) => path.relative(from, to),
      sep: path.sep,
    });
  }),
);

export const runCommand: {
  (args: readonly string[]): (command: string) => Effect.Effect<CommandResult, never, HookPlatform>;
  (command: string, args: readonly string[]): Effect.Effect<CommandResult, never, HookPlatform>;
} = Fn.dual(DATA_FIRST_ARITY, (command: string, args: readonly string[]) =>
  Effect.gen(function* run() {
    const platform = yield* HookPlatform;
    return yield* platform.runCommand(command, args);
  }),
);

export const getJson: {
  <Codec extends Schema.Top>(
    schema: Codec,
  ): (
    url: string,
  ) => Effect.Effect<Option.Option<Codec["Type"]>, never, HookPlatform | Codec["DecodingServices"]>;
  <Codec extends Schema.Top>(
    url: string,
    schema: Codec,
  ): Effect.Effect<Option.Option<Codec["Type"]>, never, HookPlatform | Codec["DecodingServices"]>;
} = Fn.dual(DATA_FIRST_ARITY, <Codec extends Schema.Top>(url: string, schema: Codec) =>
  Effect.gen(function* fetchJson() {
    const platform = yield* HookPlatform;
    return yield* platform.getJson(url, schema);
  }),
);

type RunHook<Provided> = <Value, Failure>(
  program: Effect.Effect<Value, Failure, HookPlatform | Provided>,
) => void;

export const runHookWith = <Provided, LayerFailure>({
  serviceName,
  services,
}: Readonly<{
  serviceName: string;
  services: Layer.Layer<Provided, LayerFailure, HookPlatform>;
}>): RunHook<Provided> =>
  runMainWith({ serviceName, services: Layer.provideMerge(services, platformLayer) });

export const runHook = (serviceName: string): RunHook<never> =>
  runHookWith({ serviceName, services: Layer.empty });

export type { HookBlocked };
