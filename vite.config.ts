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
  skills: {
    "artouc/stop-describe-ui": {
      commit: "251a859f6e40645030e1ae69fa4b501c851eac9c",
      root: "skills",
      skills: ["stop-describing-ui"],
    },
    "better-auth/skills": {
      commit: "20c9e88a5c007461a703f1c213572b073196113e",
      skills: [
        "better-auth-best-practices",
        "better-auth-security-best-practices",
        "email-and-password-best-practices",
      ],
    },
    "cloudflare/skills": {
      commit: "5108325ecceabc899c761e07aa617b09c02445ee",
      root: "skills",
      skills: ["cloudflare", "workers-best-practices"],
    },
    "Effect-TS/skills": {
      commit: "155c50c911f9c99c294ef8a4461981c5bbe6453e",
      root: "skills",
      skills: ["effect-ts"],
    },
    "elysiajs/skills": {
      commit: "1466d85aa4f2a0fec91f71311e65bbfa91aa7dc5",
      skills: ["elysiajs"],
    },
    "feature-sliced/skills": {
      commit: "5e95aaebb84541742686e56352b7569acf4306f1",
      skills: ["feature-sliced-design"],
    },
    "GoogleChrome/modern-web-guidance": {
      commit: "64a6d708f5a43f2cd3fde5d4d7db3905ba1bdf65",
      root: "skills",
      skills: ["modern-web-guidance"],
    },
    "masseater/skills": {
      commit: "c9a1510277ba5448da3a0e09730ce03823ab25f8",
      root: "plugins/masseater-skills/skills",
      skills: "all",
    },
    "mkosir/typescript-style-guide": {
      commit: "170074a0df9b07f4a4a78e3596ec1edf06a14da7",
      root: "skills",
      skills: ["typescript-discriminated-unions", "typescript-variables"],
    },
    "nanaism/yomiyasu": {
      commit: "3042154ee537c1b7093eefed00a97b40aae9446d",
      root: "skills",
      skills: ["yomiyasu"],
    },
    "obra/superpowers": {
      commit: "22f0b463e7a5e579904dd6211a520321035526f7",
      root: "skills",
      skills: ["systematic-debugging", "verification-before-completion"],
    },
    "philtzjp/skills": {
      commit: "5e5ecfcc72301ee9e66e56b759d7e83b3c998344",
      root: ".agents/skills",
      skills: [
        "analytics",
        "api-design",
        "commit-and-git",
        "conventions",
        "cursor-hook-authoring",
        "data-migration",
        "db",
        "e2e-testing",
        "e2etest",
        "errorpage",
        "github",
        "google-analytics",
        "hono",
        "issue-branch-pr-flow",
        "japanese",
        "japanese-writing",
        "knowledge-elicitation",
        "m4l-project",
        "refresh-skills",
        "skill-escalation",
        "skill-selection",
        "turborepo",
        "typescript-monorepo",
      ],
    },
    "shadcn-ui/ui": {
      commit: "968d8cb9dc42ae5d52e8fd356cf84596ec832a26",
      root: "skills",
      skills: ["shadcn"],
    },
  },
  msch: { workspaceAgentsMd: true },
});
