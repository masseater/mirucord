import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/shared/guild-store/*.schema.ts",
  out: "./drizzle-guild",
});
