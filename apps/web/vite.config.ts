import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import rsc from "@vitejs/plugin-rsc";
import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  run: {
    tasks: {
      dev: { command: "alchemy dev", cache: false },
      "db:generate": {
        command: ["drizzle-kit generate", "drizzle-kit generate --config drizzle.guild.config.ts"],
        cache: false,
      },
      "auth:generate": {
        command:
          "auth generate --config auth.config.ts --output src/shared/auth/generated/auth.table.ts --yes",
        cache: false,
      },
      "db:check": [
        "drizzle-kit check",
        `drizzle-kit generate --explain --output json | grep -q '"status":"no_changes"'`,
        "drizzle-kit check --config drizzle.guild.config.ts",
        `drizzle-kit generate --config drizzle.guild.config.ts --explain --output json | grep -q '"status":"no_changes"'`,
      ],
      deploy: { command: "alchemy deploy", cache: false },
      destroy: { command: "alchemy destroy", cache: false },
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
