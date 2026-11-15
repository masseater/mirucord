import { alchemyTasks } from "@repo/shared-util-app-name/run-tasks";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: { tasks: alchemyTasks },
});
