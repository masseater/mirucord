import { Stack, isResourceOfType } from "alchemy";
import { Rules } from "alchemy/Cloudflare";
import { Secret } from "alchemy/Fly";
import { Array as Arr, Effect, Match, Option, Schema } from "effect";

import { prefixesOf } from "./app-name";

type Prefixes = Readonly<{ name: string; prefix: string; envPrefix: string }>;

type NamedResource = Readonly<{ FQN: string; Props: unknown }>;

const decodeNamed = Schema.decodeUnknownOption(Schema.Struct({ name: Schema.String }));

const isFlySecret = (resource: unknown): boolean => isResourceOfType(resource, Secret.Type);

const prefixOf = (prefixes: Prefixes, resource: unknown): string =>
  Match.value(resource).pipe(
    Match.when(Rules.isList, () => prefixes.envPrefix),
    Match.when(isFlySecret, () => prefixes.envPrefix),
    Match.orElse(() => prefixes.prefix),
  );

const describeUnprefixed = (prefixes: Prefixes, resource: NamedResource): readonly string[] =>
  decodeNamed(resource.Props).pipe(
    Option.filter((props) => !props.name.startsWith(prefixOf(prefixes, resource))),
    Option.map((props) => `${resource.FQN}: ${props.name}`),
    Option.toArray,
  );

const unprefixedStack = (prefixes: Prefixes, stackName: string): readonly string[] =>
  Arr.filter(
    [`Stack: ${stackName}`],
    () => stackName !== prefixes.name && !stackName.startsWith(prefixes.prefix),
  );

const offendersOf = (prefixes: Prefixes): Effect.Effect<readonly string[], never, Stack> =>
  Effect.gen(function* offenders() {
    const stack = yield* Stack;
    return [
      ...unprefixedStack(prefixes, stack.name),
      ...Object.values(stack.resources).flatMap((resource) =>
        describeUnprefixed(prefixes, resource),
      ),
    ];
  });

export const checkAppPrefix = (name: string): Effect.Effect<readonly string[], never, Stack> => {
  const prefixes: Prefixes = { name, ...prefixesOf(name) };
  return Effect.flatMap(offendersOf(prefixes), (offenders) =>
    Arr.match(offenders, {
      onEmpty: () => Effect.succeed(offenders),
      onNonEmpty: (found) =>
        Effect.die(
          new Error(
            `Alchemy のスタック名は "${name}" か "${prefixes.prefix}" で始まる名前、リソース名は "${prefixes.prefix}"（Rules.List と Fly.Secret は "${prefixes.envPrefix}"）で始める: ${found.join(", ")}`,
          ),
        ),
    }),
  );
};
