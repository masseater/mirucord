import { alchemyTasks } from "@repo/shared-util-app-name/run-tasks";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      ...alchemyTasks,
      "deploy:production": {
        command: `[ "$FLY_ENABLED" != "true" ] || alchemy deploy --stage prod --yes --no-input`,
        cache: false,
      },
    },
  },
});
