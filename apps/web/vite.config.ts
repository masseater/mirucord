import { alchemyTasks } from "@repo/shared-util-app-name/run-tasks";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import rsc from "@vitejs/plugin-rsc";
import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  msch: {
    lint: {
      overrides: [
        { files: ["src/**/*.{ts,tsx}"], use: ["decision"] },
        {
          files: ["src/**/*.{ts,tsx}"],
          excludeFiles: [
            "src/shared/config/brand.ts",
            "src/shared/config/site.ts",
            "src/shared/crypto/keyring.server.ts",
          ],
          use: ["brand"],
        },
        { files: ["src/**/*.{ts,tsx}"], excludeFiles: ["**/*.test.ts"], use: ["traced"] },
        {
          files: ["src/**/*.server.ts", "src/**/*.test.support.ts"],
          rules: {
            "stack/server-state-tanstack-query": "off",
            "stack/ui-state-effect-atom": "off",
          },
        },
      ],
    },
  },
  run: {
    tasks: {
      dev: { command: "alchemy dev", cache: false },
      "db:generate": {
        command: ["drizzle-kit generate", "drizzle-kit generate --config drizzle.guild.config.ts"],
      },
      "auth:generate": {
        command:
          "auth generate --config auth.config.ts --output src/shared/auth/generated/auth.table.ts --yes",
      },
      "db:check": [
        "drizzle-kit check",
        `drizzle-kit generate --explain --output json | grep -q '"status":"no_changes"'`,
        "drizzle-kit check --config drizzle.guild.config.ts",
        `drizzle-kit generate --config drizzle.guild.config.ts --explain --output json | grep -q '"status":"no_changes"'`,
      ],
      ...alchemyTasks,
      "deploy:production": {
        command: [
          "alchemy deploy --stage prod --yes --no-input",
          `WORKERS_TRACES_SINK=masseater-dev-trace-sink workers-traces --request https://mirucord.masseater.dev/ --expect GET --expect "GET /" --expect d1_all --wait 300`,
        ],
        cache: false,
      },
      "deploy:ci": {
        command: "alchemy deploy --config alchemy.ci.ts --stage prod --env-file alchemy.ci.env",
        cache: false,
      },
    },
  },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart({ srcDirectory: "src/app", rsc: { enabled: true } }),
    rsc(),
    viteReact(),
  ],
});
