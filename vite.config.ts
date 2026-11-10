import htmlReact from "@html-eslint/eslint-plugin-react";
import tanstackQuery from "@r_masseater/oxlint-typed-rules/tanstack-query";
import tanstackRouter from "@r_masseater/oxlint-typed-rules/tanstack-router";
import fsd from "@r_masseater/vite-plus-adopt/fsd";
import { plugin as shadcn } from "@shadcn/lint";
import baselineJs from "eslint-plugin-baseline-js";
import { defineConfig } from "vite-plus";

import {
  allRulesOf,
  asErrors,
  decisionPluginName,
  decisionRules,
  decisionRulesOff,
  effectRules,
  eslintReactRules,
  generated,
  reactHooksRules,
  restrictedImports,
  restrictedSyntaxOverrides,
  ruleNamesOf,
  workerRules,
} from "./lint.config.ts";

const typedRules = "@r_masseater/oxlint-typed-rules";

export default defineConfig({
  commitlint: { extends: ["@commitlint/config-conventional"] },
  steiger: [
    ...fsd.configs.recommended,
    {
      rules: {
        "fsd/no-cross-imports": "error",
        "fsd/no-higher-level-imports": "error",
        "fsd/no-wildcard-exports": "error",
      },
    },
  ],
  test: { projects: ["apps/*", "libs/*/*", "infra/*", "tools/*"], passWithNoTests: true },
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
      { name: "tanstack-query", specifier: `${typedRules}/tanstack-query` },
      { name: "tanstack-router", specifier: `${typedRules}/tanstack-router` },
      { name: "tanstack-start", specifier: `${typedRules}/tanstack-start` },
      { name: "drizzle", specifier: `${typedRules}/drizzle` },
      { name: "react-hooks-js", specifier: "eslint-plugin-react-hooks" },
      { name: "@eslint-react", specifier: `${typedRules}/react` },
      { name: "shadcn", specifier: "@shadcn/lint" },
      { name: "no-comments", specifier: "eslint-plugin-no-comments" },
      { name: "baseline-js", specifier: "eslint-plugin-baseline-js" },
      { name: "@html-eslint/react", specifier: "@html-eslint/eslint-plugin-react" },
      { name: "eslint-js", specifier: "oxlint-plugin-eslint" },
      { name: decisionPluginName, specifier: "./decision-rules.ts" },
    ],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "tanstack-start/no-async-client-component": "error",
      "tanstack-start/no-client-code-in-server-component": "error",
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
            "AppIntents",
            "CloudflareApiLive",
            "Resource",
            "Stack",
            "Secret",
            "Secrets",
            "Service",
            "Variables",
            "WorkerIssues",
          ],
          capIsNewExceptionPattern: String.raw`^(ApiToken|Config|Context|Data|Schema|AnalyticsEngine|D1|Queues|R2|Ruleset|Rules|SecretsStore|Vectorize|Website|Workers|Zone)\.`,
        },
      ],
      "typescript/no-empty-interface": ["error", { allowSingleExtends: true }],
      "typescript/no-empty-object-type": ["error", { allowInterfaces: "with-single-extends" }],
      "react/jsx-filename-extension": ["error", { extensions: [".tsx"] }],
      "react/only-export-components": ["error", { allowExportNames: ["Route"] }],
    },
    overrides: [
      ...restrictedSyntaxOverrides,
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
        rules: { ...decisionRules, ...workerRules },
      },
      {
        files: ["**/*.test.ts"],
        rules: {
          ...decisionRulesOff,
          "eslint/no-restricted-imports": ["error", restrictedImports],
          "eslint/no-restricted-properties": "off",
        },
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
      "markdown-lint": [
        'textlint "**/*.md"',
        `git -c core.quotePath=false ls-files -co --exclude-standard '*.md' | git -c core.quotePath=false -c core.excludesFile=.textlintignore check-ignore --no-index --stdin -nv | awk -F '\\t' '$1 == "::" { print $2 }' | tr '\\n' '\\0' | xargs -0 -r -n 1 -P 4 python3 "$(skills ls --json | jq -r '.[] | select(.name == "yomiyasu").path')/scripts/yomiyasu_lint.py" --strict`,
      ],
      renovate: "renovate-config-validator --strict",
      fallow: [
        "fallow --skip dupes --fail-on-issues --quiet --format compact",
        "fallow dead-code --no-production --fail-on-issues --quiet --format compact",
        "fallow dead-code --no-production --quiet --format json | jq -e '[.prop_drilling_chains, .thin_wrappers, .duplicate_prop_shapes] | all(length == 0)' > /dev/null",
        "fallow dupes --fail-on-issues --quiet --format compact",
        "fallow security --fail-on-issues --quiet",
      ],
      "actions-lint": {
        command:
          'actionlint && zizmor $(test -n "$CLAUDE_CODE_REMOTE" && echo --no-online-audits) .github && ast-grep scan --rule .github/rules/no-full-history-checkout.yml .github/workflows',
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
        command: "vp check --deny-warnings",
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
          "test",
          "syncpack",
          "markdown-lint",
          "renovate",
          "actions-lint",
          "steiger",
          "db-check-all",
          "fallow",
          "audit",
        ],
      },
      test: "vp test run",
      syncpack: "syncpack lint",
      steiger: "vpa steiger apps/*/src",
      "db-check-all": "vp run -r db:check",
      audit: {
        command:
          'before="$(cksum pnpm-workspace.yaml)"; vp pm audit --fix || exit; if [ "$before" != "$(cksum pnpm-workspace.yaml)" ]; then echo "vp pm audit --fix rewrote pnpm-workspace.yaml. Run vp install and commit the diff." >&2; exit 1; fi',
        cache: false,
      },
      betterleaks: {
        command:
          'betterleaks git . --config .betterleaks.toml --redact --no-banner --revision="$(git rev-parse -q --verify "$BETTERLEAKS_BASE" || echo origin/main)..HEAD"',
        cache: false,
      },
      "betterleaks:staged": {
        command:
          "git diff --cached --no-ext-diff --no-textconv --no-color --src-prefix=a/ --dst-prefix=b/ | betterleaks stdin --git-diff --config .betterleaks.toml --redact --no-banner",
        cache: false,
      },
    },
  },
});
