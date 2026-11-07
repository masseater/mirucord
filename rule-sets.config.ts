import { presets as effectPresets } from "@effect/tsgo/oxlint-presets";
import eslintReact from "@eslint-react/eslint-plugin";
import { Array, pipe, Record, String as Str } from "effect";
import reactHooks from "eslint-plugin-react-hooks";

type RuleMap = Readonly<Record<string, unknown>>;
type Rules = Readonly<Record<string, "error">>;

const ruleNamesOf = (rules: RuleMap | undefined): readonly string[] => Record.keys(rules ?? {});

const asErrors = (names: readonly string[]): Rules =>
  Record.fromEntries(
    pipe(
      names,
      Array.map((name) => [name, "error"] as const),
    ),
  );

const allRulesOf = ({ prefix, rules }: Readonly<{ prefix: string; rules: RuleMap }>): Rules =>
  asErrors(
    pipe(
      ruleNamesOf(rules),
      Array.map((rule) => `${prefix}/${rule}`),
    ),
  );

const renamedRulesOf = ({
  rules,
  from,
  to,
}: Readonly<{ rules: RuleMap; from: string; to: string }>): Rules =>
  asErrors(
    pipe(
      ruleNamesOf(rules),
      Array.map((name) => pipe(name, Str.replace(from, to))),
    ),
  );

const rulesMissingFrom = ({
  rules,
  from,
  to,
  taken,
}: Readonly<{ rules: RuleMap | undefined; from: string; to: string; taken: Rules }>): Rules =>
  asErrors(
    pipe(
      ruleNamesOf(rules),
      Array.filter((name) => !(pipe(name, Str.replace(from, to)) in taken)),
    ),
  );

const presetRulesOf = (presets: Readonly<Record<string, Readonly<{ rules?: RuleMap }>>>): Rules =>
  asErrors(
    pipe(
      Record.values(presets),
      Array.flatMap((preset) => ruleNamesOf(preset.rules)),
    ),
  );

const reactHooksRules = renamedRulesOf({
  rules: reactHooks.configs["recommended-latest"].rules,
  from: "react-hooks/",
  to: "react-hooks-js/",
});

const eslintReactRules = rulesMissingFrom({
  rules: eslintReact.configs["strict-typescript"].rules,
  from: "@eslint-react/",
  to: "react-hooks-js/",
  taken: reactHooksRules,
});

const effectRules = presetRulesOf(effectPresets);

export { allRulesOf, asErrors, effectRules, eslintReactRules, reactHooksRules, ruleNamesOf };
export type { RuleMap, Rules };
