import {
  cloudflareResourceSyntax,
  decisionRules,
  decisionTestRules,
  generated,
  lint as preset,
  removalPolicySyntax,
  requiredStack,
  steigerRules,
  tracedRules,
} from "@r_masseater/msch/lint";
import type { ToolSections } from "@r_masseater/msch/vite";
import { workspaceSettings } from "@r_masseater/msch/workspace-settings";
import type { RuleSets } from "@r_masseater/msch/workspace-settings";
import { restrictedSyntax as unguardedWorkersAi } from "@r_masseater/workers-tracing/oxlint";
import { Array as Arr, pipe } from "effect";
import { defineConfig } from "vite-plus";
import type { UserConfig } from "vite-plus";

type LintConfig = NonNullable<UserConfig["lint"]>;

const BRAND_WORDS = "/[Mm]irucord|ミル/";
const BRAND_MESSAGE =
  "サービス名とキャラクター名は #/shared/config の SERVICE_NAME と MASCOT_NAME から参照する";

const ruleSets: RuleSets = {
  decision: decisionRules,
  traced: tracedRules,
  brand: {
    "eslint-js/no-restricted-syntax": [
      "error",
      { selector: `Literal[value=${BRAND_WORDS}]`, message: BRAND_MESSAGE },
      { selector: `TemplateElement[value.raw=${BRAND_WORDS}]`, message: BRAND_MESSAGE },
      { selector: `JSXText[value=${BRAND_WORDS}]`, message: BRAND_MESSAGE },
      removalPolicySyntax,
      ...unguardedWorkersAi,
    ],
  },
};

const workspace = await workspaceSettings({
  root: import.meta.dirname,
  ruleSets,
  dependencySets: {},
});

const APP_NAME_MESSAGE =
  "スタックの最後で @repo/shared-util-app-name の requireAppPrefix を yield* して、リソース名の prefix を検査する";

const overrides = [
  {
    files: ["apps/*/src/**/*.{ts,tsx}"],
    excludeFiles: ["**/*.test.ts"],
    rules: {
      "eslint-js/no-restricted-syntax": ["error", removalPolicySyntax, ...unguardedWorkersAi],
    },
  },
  {
    files: ["**/alchemy.*.ts"],
    rules: {
      "eslint-js/no-restricted-syntax": [
        "error",
        ...cloudflareResourceSyntax,
        removalPolicySyntax,
        {
          selector:
            'CallExpression[callee.name="Stack"]:not([arguments.0.name="APP_NAME"]):not([arguments.0.type="TemplateLiteral"][arguments.0.quasis.0.value.raw=""][arguments.0.expressions.0.name="PREFIX"])',
          message:
            "スタック名には @repo/shared-util-app-name の APP_NAME か、PREFIX で始まるテンプレートリテラルを渡す",
        },
        {
          selector:
            'Program:not(:has(YieldExpression[delegate=true] > Identifier.argument[name="requireAppPrefix"]))',
          message: APP_NAME_MESSAGE,
        },
        {
          selector:
            'CallExpression[callee.name="Stack"] > .arguments:nth-child(3):not(:has(FunctionExpression > BlockStatement > ExpressionStatement:nth-last-child(2) > YieldExpression[delegate=true] > Identifier.argument[name="requireAppPrefix"]))',
          message: APP_NAME_MESSAGE,
        },
      ],
    },
  },
  {
    files: [...workspace.lint.shadcnUi],
    rules: { "react/jsx-props-no-spreading": "off" },
  },
  {
    files: [...workspace.lint.publicEntries, "**/src/app/server/index.ts"],
    rules: { "import/no-default-export": "off" },
  },
  ...workspace.lint.overrides,
  {
    files: ["**/*.test.ts"],
    rules: decisionTestRules,
  },
] satisfies LintConfig["overrides"];

const lint = {
  ...preset,
  ignorePatterns: [...generated, ...workspace.lint.ignorePatterns],
  overrides: [...preset.overrides, ...overrides],
} satisfies LintConfig;

const MARKDOWN_IGNORES = ["AGENTS.md", ".agents/skills/**", "CHANGELOG.md"];

const PUBLIC_VALUES = [String.raw`\bCF_BEACON_TOKEN = "[0-9a-f]{32}"`];

const checks: ToolSections = {
  commitlint: { extends: ["@commitlint/config-conventional"] },
  dependencyRules: { banned: requiredStack, peerRanges: "intersect" },
  betterleaks: {
    extend: { useDefault: true },
    filter: `matchesAny(finding.line, [${pipe(
      PUBLIC_VALUES,
      Arr.map((pattern) => `\`${pattern}\``),
      Arr.join(", "),
    )}])`,
  },
  steiger: {
    paths: ["apps/*/src"],
    rules: steigerRules,
  },
  textlint: {
    ignores: MARKDOWN_IGNORES,
    rules: {
      "@textlint-ja/preset-ai-writing": true,
      "@r_masseater/preset-ja": { "no-taigendome": false },
      "preset-ja-technical-writing": {
        "sentence-length": { max: 120 },
        "ja-no-mixed-period": { allowPeriodMarks: [":"] },
        "no-mix-dearu-desumasu": { preferInBody: "である", preferInList: "である" },
        "max-kanji-continuous-len": {
          max: 6,
          allow: [
            "外国電子決済手段",
            "電子決済手段等取引業",
            "前払式支払手段",
            "犯罪収益移転防止法",
            "事業者間取引適正化等法",
            "個人情報保護法",
            "特定商取引法",
            "電気通信利用役務",
            "特定業務委託事業者",
          ],
        },
      },
    },
  },
};

export default defineConfig({
  ...checks,
  msch: { workspaceAgentsMd: true },
  test: { projects: [...workspace.testProjects], passWithNoTests: true },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: lint.ignorePatterns,
    sortImports: true,
    sortTailwindcss: true,
    sortPackageJson: true,
  },
  lint,
  run: {
    cache: true,
    tasks: {
      renovate: "renovate-config-validator --strict",
      fallow: [
        "fallow --skip dupes --fail-on-issues --quiet --format compact",
        "fallow dead-code --no-production --fail-on-issues --quiet --format compact",
        "fallow dead-code --no-production --quiet --format json | jq -e '[.prop_drilling_chains, .thin_wrappers, .duplicate_prop_shapes] | all(length == 0)' > /dev/null",
        "fallow dupes --fail-on-issues --quiet --format compact",
        "fallow security --fail-on-issues --quiet",
      ],
      "actions-lint":
        "ast-grep scan --rule .github/rules/no-full-history-checkout.yml .github/workflows",
      verify: {
        command: "vp check --deny-warnings",
        cache: {
          env: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_AI_GATEWAY_ID"],
          untrackedEnv: [
            "CLOUDFLARE_API_TOKEN",
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
          ...workspace.tasks.verify,
          "test",
          "msch",
          "renovate",
          "actions-lint",
          "db-check-all",
          "fallow",
          "audit",
        ],
      },
      test: "vp test run",
      msch: { command: "msch", cache: false },
      "db-check-all": "vp run -r db:check",
      audit: {
        command:
          'before="$(cksum pnpm-workspace.yaml)"; vp pm audit --fix || exit; if [ "$before" != "$(cksum pnpm-workspace.yaml)" ]; then echo "vp pm audit --fix rewrote pnpm-workspace.yaml. Run vp install and commit the diff." >&2; exit 1; fi',
        cache: false,
      },
    },
  },
});
