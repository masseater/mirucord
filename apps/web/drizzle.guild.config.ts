import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/entities/guild-message/model/*.schema.ts",
  out: "./drizzle-guild",
});
