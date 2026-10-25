import { Array, pipe, Record, String as Str } from "effect";

import decisionPlugin from "./decision-rules.ts";

const REACT_STATE_HOOKS: readonly string[] = [
  "useState",
  "useReducer",
  "createContext",
  "useContext",
];
const HAND_WRITTEN_SQL = "SQL を手書きせず Drizzle のクエリビルダーを使う";
const UI_STATE = "UI 状態は effect-atom だけで扱う";

const requiredStack: Readonly<Record<string, readonly string[]>> = {
  [UI_STATE]: [
    "zustand",
    "jotai",
    "valtio",
    "recoil",
    "mobx",
    "mobx-*",
    "redux",
    "@reduxjs/*",
    "react-redux",
    "xstate",
    "@xstate/*",
    "nanostores",
    "@nanostores/*",
    "@preact/signals*",
  ],
  "サーバー状態は TanStack Query と Eden だけで扱う": [
    "swr",
    "react-query",
    "@apollo/*",
    "urql",
    "@urql/*",
    "axios",
    "ky",
    "ofetch",
    "got",
    "node-fetch",
    "graphql-request",
    "@trpc/*",
  ],
  "ルーティングとサーバーは TanStack Start と Elysia だけで扱う": [
    "react-router",
    "react-router-dom",
    "next",
    "@remix-run/*",
    "wouter",
    "express",
    "hono",
    "fastify",
    "koa",
    "@nestjs/*",
  ],
  "データベースは Drizzle だけで扱い、スキーマはマイグレーションで生成する": [
    "prisma",
    "@prisma/*",
    "typeorm",
    "sequelize",
    "kysely",
    "knex",
    "@mikro-orm/*",
    "better-sqlite3",
    "pg",
    "mysql2",
  ],
  "認証は better-auth だけで扱う": [
    "next-auth",
    "@auth/*",
    "lucia",
    "passport",
    "passport-*",
    "@clerk/*",
    "firebase/auth",
    "@supabase/*",
  ],
  "UI は shadcn/ui と Tailwind CSS だけで組む": [
    "@mui/*",
    "antd",
    "@chakra-ui/*",
    "@mantine/*",
    "styled-components",
    "@emotion/*",
    "bootstrap",
    "react-bootstrap",
  ],
  "検証、日時、ログ、関数型ユーティリティは Effect だけで扱う": [
    "zod",
    "yup",
    "joi",
    "valibot",
    "arktype",
    "io-ts",
    "superstruct",
    "moment",
    "dayjs",
    "date-fns",
    "luxon",
    "winston",
    "pino",
    "bunyan",
    "loglevel",
    "lodash",
    "lodash-es",
    "ramda",
    "rxjs",
    "fp-ts",
    "neverthrow",
    "ts-results",
    "purify-ts",
  ],
  "フィーチャーフラグは OpenFeature だけで扱う": [
    "launchdarkly-*",
    "@launchdarkly/*",
    "@growthbook/*",
    "unleash-client",
    "flagsmith",
    "@vercel/flags",
  ],
  "計装は Effect のトレーシングだけで扱う": ["@opentelemetry/*", "dd-trace", "newrelic"],
  "インフラは Alchemy の IaC と Cloudflare だけで扱い、wrangler は使わない": [
    "wrangler",
    "miniflare",
    "@cloudflare/vite-plugin",
    "@vercel/*",
    "@netlify/*",
    "aws-cdk",
    "aws-cdk-lib",
    "@pulumi/*",
    "cdktf",
  ],
};

const requiredStackEntries = pipe(
  Record.toEntries(requiredStack),
  Array.flatMap(([message, modules]) =>
    pipe(
      modules,
      Array.map((module) => ({ message, module })),
    ),
  ),
);

const requiredStackPaths: readonly Readonly<{ name: string; message: string }>[] = pipe(
  requiredStackEntries,
  Array.filter(({ module }) => !pipe(module, Str.includes("*"))),
  Array.map(({ message, module }) => ({ name: module, message })),
);

const requiredStackPatterns: readonly Readonly<{ group: readonly string[]; message: string }>[] =
  pipe(
    requiredStackEntries,
    Array.map(({ message, module }) => {
      if (pipe(module, Str.includes("*"))) {
        return { group: [module, `${module}/**`], message };
      }
      return { group: [`${module}/**`], message };
    }),
  );

const restrictedImports = {
  paths: [
    {
      name: "react",
      importNames: [...REACT_STATE_HOOKS],
      message: UI_STATE,
    },
    { name: "drizzle-orm", importNames: ["sql"], message: HAND_WRITTEN_SQL },
    { name: "drizzle-orm/sql", message: HAND_WRITTEN_SQL },
    ...requiredStackPaths,
  ],
  patterns: [...requiredStackPatterns],
};

const generated = [
  "**/routeTree.gen.ts",
  "**/generated/**",
  "**/drizzle/**/snapshot.json",
  ".claude/skills/**",
  ".claude/hooks/fallow-gate.sh",
  ".intent/**",
  "AGENTS.md",
  "skills-lock.json",
  "CHANGELOG.md",
];

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

const decisionPluginName = decisionPlugin.meta.name;

const decisionRules = asErrors(
  pipe(
    Record.keys(decisionPlugin.rules),
    Array.map((id) => `${decisionPluginName}/${id}`),
  ),
);

const decisionRulesOff = pipe(
  decisionRules,
  Record.map(() => "off" as const),
);

export {
  allRulesOf,
  asErrors,
  decisionPluginName,
  decisionRules,
  decisionRulesOff,
  generated,
  presetRulesOf,
  renamedRulesOf,
  requiredStack,
  restrictedImports,
  ruleNamesOf,
  rulesMissingFrom,
};
export type { RuleMap, Rules };
