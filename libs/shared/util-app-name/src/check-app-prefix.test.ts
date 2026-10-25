import { Stack } from "alchemy";
import { D1, Rules } from "alchemy/Cloudflare";
import { App, Secret } from "alchemy/Fly";
import { Secrets, Variables } from "alchemy/GitHub";
import { Stage } from "alchemy/Stage";
import { inMemoryState } from "alchemy/State";
import { Effect, Exit, Layer, Match, pipe, Redacted, String as Str } from "effect";
import { expect, test } from "vite-plus/test";

import { checkAppPrefix } from "./check-app-prefix";

const APP = "my-app";
const PREFIX = `${APP}-`;
const ENV_PREFIX = `${pipe(APP, Str.replaceAll("-", "_"))}_`;
const requireAppPrefix = checkAppPrefix(APP);

type Resource =
  | Readonly<{ type: "database"; props: Readonly<{ name?: string }> }>
  | Readonly<{ type: "list"; name: string }>
  | Readonly<{ type: "secret"; name: string }>
  | Readonly<{ type: "githubSecret"; name: string }>
  | Readonly<{ type: "githubVariable"; name: string }>;

const REPO = { owner: "owner", repository: "repo" };

const flySecret = Effect.fn("flySecret")(function* flySecret(name: string) {
  const app = yield* App("App", { name: `${PREFIX}app` });
  return yield* Secret("Secret", { app, name, value: Redacted.make("value") });
});

const deploys = (stackName: string, resource: Resource): Promise<boolean> =>
  Effect.runPromise(
    Stack(
      stackName,
      { providers: Layer.empty, state: inMemoryState() },
      Effect.gen(function* stack() {
        yield* Match.value(resource).pipe(
          Match.discriminatorsExhaustive("type")({
            database: ({ props }) => D1.Database("DB", props),
            list: ({ name }) => Rules.List("List", { name, kind: "ip", items: [] }),
            secret: ({ name }) => flySecret(name),
            githubSecret: ({ name }) =>
              Secrets({ ...REPO, secrets: { [name]: Redacted.make("value") } }),
            githubVariable: ({ name }) => Variables({ ...REPO, variables: { [name]: "value" } }),
          }),
        );
        yield* requireAppPrefix;
      }),
    ).pipe(
      Effect.provideService(Stage, "test"),
      Effect.scoped,
      Effect.exit,
      Effect.map(Exit.isSuccess),
    ),
  );

test.each<Readonly<{ stackName: string; resource: Resource; expected: boolean }>>([
  { stackName: APP, resource: { type: "database", props: {} }, expected: true },
  {
    stackName: APP,
    resource: { type: "database", props: { name: `${PREFIX}db` } },
    expected: true,
  },
  { stackName: APP, resource: { type: "database", props: { name: "web-db" } }, expected: false },
  {
    stackName: APP,
    resource: { type: "database", props: { name: `${ENV_PREFIX}db` } },
    expected: false,
  },
  { stackName: APP, resource: { type: "list", name: `${ENV_PREFIX}hosts` }, expected: true },
  { stackName: APP, resource: { type: "list", name: "web_hosts" }, expected: false },
  { stackName: APP, resource: { type: "secret", name: `${ENV_PREFIX}TOKEN` }, expected: true },
  { stackName: APP, resource: { type: "secret", name: "TOKEN" }, expected: false },
  { stackName: APP, resource: { type: "secret", name: `${PREFIX}TOKEN` }, expected: false },
  { stackName: APP, resource: { type: "githubSecret", name: "API_TOKEN" }, expected: true },
  { stackName: APP, resource: { type: "githubVariable", name: "MAX_ITEMS" }, expected: true },
  { stackName: `${PREFIX}gateway`, resource: { type: "database", props: {} }, expected: true },
  { stackName: "web", resource: { type: "database", props: {} }, expected: false },
])("stack $stackName with $resource deploys: $expected", ({ stackName, resource, expected }) =>
  expect(deploys(stackName, resource)).resolves.toBe(expected),
);
