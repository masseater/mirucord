import { presets as effectPresets } from "@effect/tsgo/oxlint-presets";
import eslintReact from "@eslint-react/eslint-plugin";
import htmlReact from "@html-eslint/eslint-plugin-react";
import { plugin as shadcn } from "@shadcn/lint";
import tanstackQuery from "@tanstack/eslint-plugin-query";
import tanstackRouter from "@tanstack/eslint-plugin-router";
import baselineJs from "eslint-plugin-baseline-js";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "vite-plus";

import {
  allRulesOf,
  asErrors,
  decisionPluginName,
  decisionRules,
  decisionRulesOff,
  generated,
  presetRulesOf,
  renamedRulesOf,
  restrictedImports,
  ruleNamesOf,
  rulesMissingFrom,
} from "./lint.config.ts";

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

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: generated,
    sortImports: true,
    sortTailwindcss: true,
    sortPackageJson: true,
  },
  lint: {
    ignorePatterns: generated,
    plugins: [
      "eslint",
      "typescript",
      "unicorn",
      "oxc",
      "import",
      "react",
      "react-perf",
      "jsx-a11y",
      "jsdoc",
      "promise",
      "node",
      "effecttsgo",
    ],
    categories: {
      correctness: "error",
      suspicious: "error",
      pedantic: "error",
      perf: "error",
      style: "error",
      restriction: "error",
      nursery: "error",
    },
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      { name: "tanstack-query", specifier: "@tanstack/eslint-plugin-query" },
      { name: "tanstack-router", specifier: "@tanstack/eslint-plugin-router" },
      { name: "drizzle", specifier: "eslint-plugin-drizzle" },
      { name: "react-hooks-js", specifier: "eslint-plugin-react-hooks" },
      { name: "@eslint-react", specifier: "@eslint-react/eslint-plugin" },
      { name: "shadcn", specifier: "@shadcn/lint" },
      { name: "no-comments", specifier: "eslint-plugin-no-comments" },
      { name: "baseline-js", specifier: "eslint-plugin-baseline-js" },
      { name: "@html-eslint/react", specifier: "@html-eslint/eslint-plugin-react" },
      { name: decisionPluginName, specifier: "./decision-rules.ts" },
    ],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "no-comments/disallowComments": ["error", { allow: ["oxlint-disable", "eslint-disable"] }],
      ...allRulesOf({ prefix: "tanstack-query", rules: tanstackQuery.rules }),
      ...allRulesOf({ prefix: "tanstack-router", rules: tanstackRouter.rules }),
      "drizzle/enforce-delete-with-where": ["error", { drizzleObjectName: ["db"] }],
      "drizzle/enforce-update-with-where": ["error", { drizzleObjectName: ["db"] }],
      ...allRulesOf({ prefix: "shadcn", rules: shadcn.rules }),
      ...allRulesOf({ prefix: "baseline-js", rules: baselineJs.rules }),
      ...baselineJs.configs.recommended().rules,
      ...asErrors(ruleNamesOf(htmlReact.configs.all.rules)),
      ...reactHooksRules,
      ...eslintReactRules,
      ...effectRules,
      "eslint/sort-imports": "off",
      "eslint/sort-keys": "off",
      "import/no-named-export": "off",
      "import/prefer-default-export": "off",
      "react/react-in-jsx-scope": "off",
      "eslint/no-undef": "off",
      "typescript/promise-function-async": "off",
      "react/forbid-component-props": "off",
      "oxc/no-rest-spread-properties": "off",
      "node/no-top-level-await": "off",
      "eslint/one-var": ["error", "never"],
      "eslint/no-restricted-imports": ["error", restrictedImports],
      "typescript/prefer-readonly-parameter-types": [
        "error",
        {
          ignoreInferredTypes: true,
          allow: [
            {
              from: "lib",
              name: [
                "Request",
                "Response",
                "CryptoKey",
                "Int8Array",
                "Float32Array",
                "Float64Array",
                "Uint8Array",
                "Uint16Array",
                "Uint32Array",
              ],
            },
            {
              from: "package",
              package: "@cloudflare/workers-types",
              name: "AnalyticsEngineDataset",
            },
            { from: "package", package: "@tanstack/query-core", name: "QueryClient" },
            { from: "package", package: "drizzle-orm", name: ["DrizzleSqliteDODatabase", "SQL"] },
            {
              from: "package",
              package: "react",
              name: ["ReactNode", "ButtonHTMLAttributes", "ClassAttributes"],
            },
            { from: "package", package: "clsx", name: "ClassValue" },
            {
              from: "package",
              package: "effect",
              name: ["Cause", "Context", "DateTime", "Effect", "Exit", "Layer", "Option", "Utc"],
            },
          ],
        },
      ],
      "eslint/no-duplicate-imports": ["error", { allowSeparateTypeImports: true }],
      "react/function-component-definition": [
        "error",
        { namedComponents: "arrow-function", unnamedComponents: "arrow-function" },
      ],
      "eslint/new-cap": [
        "error",
        {
          capIsNewExceptions: [
            "App",
            "CloudflareApiLive",
            "Resource",
            "Stack",
            "Secret",
            "Secrets",
            "Service",
            "Variables",
            "WorkerIssues",
          ],
          capIsNewExceptionPattern:
            "^(ApiToken|Config|Context|Data|Schema|AnalyticsEngine|D1|Queues|R2|Ruleset|Rules|SecretsStore|Vectorize|Website|Workers|Zone)\\.",
        },
      ],
      "typescript/no-empty-interface": ["error", { allowSingleExtends: true }],
      "typescript/no-empty-object-type": ["error", { allowInterfaces: "with-single-extends" }],
      "react/jsx-filename-extension": ["error", { extensions: [".tsx"] }],
      "react/only-export-components": ["error", { allowExportNames: ["Route"] }],
    },
    overrides: [
      {
        files: [
          "**/*.config.ts",
          "**/alchemy.run.ts",
          "**/*.worker.ts",
          "**/alchemy.ci.ts",
          "**/src/app/server/index.ts",
          "decision-rules.ts",
        ],
        rules: { "import/no-default-export": "off" },
      },
      {
        files: ["**/shared/ui/**"],
        rules: { "shadcn/no-restyle": "off", "react/jsx-props-no-spreading": "off" },
      },
      {
        files: ["apps/web/src/**/*.{ts,tsx}"],
        rules: decisionRules,
      },
      {
        files: ["**/*.test.ts"],
        rules: decisionRulesOff,
      },
    ],
    settings: {
      [decisionPluginName]: { model: "openrouter/typesafe/jev-1.14" },
    },
    options: {
      typeAware: true,
      typeCheck: true,
      denyWarnings: true,
      reportUnusedDisableDirectives: "error",
    },
  },
  run: {
    cache: true,
    tasks: {
      "actions-lint": {
        command:
          'uvx --from actionlint-py@1.7.12.25 actionlint && uvx zizmor@1.31.1 $(test -n "$CLAUDE_CODE_REMOTE" && echo --no-online-audits) .github && ast-grep scan --rule .github/rules/no-full-history-checkout.yml .github/workflows',
        cache: {
          env: ["CLAUDE_CODE_REMOTE"],
          untrackedEnv: [
            "GH_TOKEN",
            "HTTPS_PROXY",
            "https_proxy",
            "NO_PROXY",
            "no_proxy",
            "SSL_CERT_FILE",
          ],
        },
      },
      verify: {
        command: "vp check",
        cache: {
          env: ["OPENROUTER_API_KEY"],
          untrackedEnv: [
            "CLAUDECODE",
            "CLAUDE_CODE_REMOTE",
            "GITHUB_ACTIONS",
            "HTTPS_PROXY",
            "https_proxy",
            "NO_PROXY",
            "no_proxy",
            "SSL_CERT_FILE",
            "NODE_EXTRA_CA_CERTS",
          ],
        },
        dependsOn: [
          "test-all",
          "eslint",
          "syncpack",
          "markdown-lint",
          "renovate",
          "actions-lint",
          "steiger-all",
          "db-check-all",
          "fallow-all",
          "gitleaks",
          "audit",
        ],
      },
      "test-all": "vp run -r test",
      eslint: "NODE_OPTIONS=--max-old-space-size=4096 eslint --max-warnings 0 .",
      syncpack: "syncpack lint",
      "steiger-all": "vp run -r steiger",
      "db-check-all": "vp run -r db:check",
      "fallow-all": "vp run -r fallow",
      audit: {
        command: "vp pm audit",
        cache: false,
      },
      gitleaks: {
        command: "go run github.com/zricethezav/gitleaks/v8@v8.30.1 git --redact --no-banner",
        cache: false,
      },
    },
  },
});
