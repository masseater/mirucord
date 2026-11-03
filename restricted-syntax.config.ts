import type { OxlintOverride } from "vite-plus/lint";

const BRAND_WORDS = "/[Mm]irucord|ミル/";
const BRAND_MESSAGE =
  "サービス名とキャラクター名は #/shared/config の SERVICE_NAME と MASCOT_NAME から参照する";
const restrictedSyntaxOverrides: readonly OxlintOverride[] = [
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    rules: {
      "eslint-js/no-restricted-syntax": [
        "error",
        { selector: `Literal[value=${BRAND_WORDS}]`, message: BRAND_MESSAGE },
        { selector: `TemplateElement[value.raw=${BRAND_WORDS}]`, message: BRAND_MESSAGE },
        { selector: `JSXText[value=${BRAND_WORDS}]`, message: BRAND_MESSAGE },
      ],
    },
  },
  {
    files: [
      "apps/web/src/shared/config/brand.ts",
      "apps/web/src/shared/config/site.ts",
      "apps/web/src/shared/crypto/keyring.server.ts",
    ],
    rules: { "eslint-js/no-restricted-syntax": "off" },
  },
  {
    files: ["**/alchemy.*.ts"],
    rules: {
      "eslint-js/no-restricted-syntax": [
        "error",
        {
          selector:
            'CallExpression[callee.name="Stack"]:not([arguments.0.name="APP_NAME"]):not([arguments.0.type="TemplateLiteral"][arguments.0.quasis.0.value.raw=""][arguments.0.expressions.0.name="PREFIX"])',
          message:
            "スタック名には @repo/shared-util-app-name の APP_NAME か、PREFIX で始まるテンプレートリテラルを渡す",
        },
        {
          selector:
            'Program:not(:has(YieldExpression[delegate=true] > Identifier.argument[name="requireAppPrefix"]))',
          message:
            "スタックの最後で @repo/shared-util-app-name の requireAppPrefix を yield* して、リソース名の prefix を検査する",
        },
        {
          selector:
            'CallExpression[callee.name="Stack"] > .arguments:nth-child(3):not(:has(FunctionExpression > BlockStatement > ExpressionStatement:nth-last-child(2) > YieldExpression[delegate=true] > Identifier.argument[name="requireAppPrefix"]))',
          message:
            "スタックの最後で @repo/shared-util-app-name の requireAppPrefix を yield* して、リソース名の prefix を検査する",
        },
      ],
    },
  },
];

export { restrictedSyntaxOverrides };
