import { OpenFeature, TypedInMemoryProvider } from "@openfeature/server-sdk";
import { Boolean, Effect } from "effect";

const INGEST_FLAG = "ingest-enabled";

const flagConfiguration = {
  [INGEST_FLAG]: {
    variants: { on: true, off: false },
    defaultVariant: "on",
    disabled: false,
  },
} as const;

const ingestEnabled: Effect.Effect<boolean> = Effect.promise(() =>
  OpenFeature.setProviderAndWait(new TypedInMemoryProvider(flagConfiguration)),
).pipe(
  Effect.andThen(Effect.promise(() => OpenFeature.getClient().getBooleanValue(INGEST_FLAG, false))),
);

const whenIngestEnabled = <Failure>(
  work: Effect.Effect<void, Failure>,
): Effect.Effect<void, Failure> =>
  ingestEnabled.pipe(
    Effect.flatMap((enabled) =>
      Boolean.match(enabled, { onTrue: () => work, onFalse: () => Effect.void }),
    ),
  );

export { whenIngestEnabled };
