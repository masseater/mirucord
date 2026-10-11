import { defineConfig, globalIgnores, includeIgnoreFile } from "@eslint/config-helpers";
import tanstackStart from "@tanstack/eslint-plugin-start";
import parser from "@typescript-eslint/parser";

import { generated } from "./lint.config.ts";

const BRAND_WORDS = "/[Mm]irucord|ミル/";
const BRAND_MESSAGE =
  "サービス名とキャラクター名は #/shared/config の SERVICE_NAME と MASCOT_NAME から参照する";

export default defineConfig(
  includeIgnoreFile(`${import.meta.dirname}/.gitignore`),
  globalIgnores(generated),
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parser, parserOptions: { projectService: true } },
    extends: [tanstackStart.configs["flat/recommended"]],
    linterOptions: { reportUnusedDisableDirectives: "error", reportUnusedInlineConfigs: "error" },
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    ignores: [
      "apps/web/src/shared/config/brand.ts",
      "apps/web/src/shared/config/site.ts",
      "apps/web/src/shared/crypto/keyring.server.ts",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: `Literal[value=${BRAND_WORDS}]`, message: BRAND_MESSAGE },
        { selector: `TemplateElement[value.raw=${BRAND_WORDS}]`, message: BRAND_MESSAGE },
        { selector: `JSXText[value=${BRAND_WORDS}]`, message: BRAND_MESSAGE },
      ],
    },
  },
);
