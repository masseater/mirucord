import { repositoryConfig } from "@r_masseater/msch/config";
import {
  cloudflareResourceSyntax,
  decisionRules,
  removalPolicySyntax,
  tracedRules,
} from "@r_masseater/msch/lint";
import { workspaceSettings } from "@r_masseater/msch/workspace-settings";
import { restrictedSyntax as unguardedWorkersAi } from "@r_masseater/workers-tracing/oxlint";
import { defineConfig } from "vite-plus";

const BRAND_WORDS = "/[Mm]irucord|ミル/";
const BRAND_MESSAGE =
  "サービス名とキャラクター名は #/shared/config の SERVICE_NAME と MASCOT_NAME から参照する";
const APP_NAME_MESSAGE =
  "スタックの最後で @repo/shared-util-app-name の requireAppPrefix を yield* して、リソース名の prefix を検査する";

const workspace = await workspaceSettings({
  root: import.meta.dirname,
  ruleSets: {
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
  },
  dependencySets: {},
});

export default defineConfig({
  ...repositoryConfig({
    workspace,
    overrides: [
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
    ],
    textlint: {
      kanji: [
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
      rules: { "@r_masseater/preset-ja": { "no-taigendome": false } },
    },
    run: {
      tasks: {
        renovate: "renovate-config-validator --strict",
        "db-check-all": "vp run -r db:check",
      },
    },
  }),
  msch: { workspaceAgentsMd: true },
});
