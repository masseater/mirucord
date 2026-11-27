import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { Effect } from "effect";
import { defineConfig } from "vite-plus";

const MIGRATIONS_DIR = `${import.meta.dirname}/drizzle`;

const readMigrations = Effect.promise(() =>
  readD1Migrations({
    migrationsDir: MIGRATIONS_DIR,
    migrationsPattern: `${MIGRATIONS_DIR}/*/migration.sql`,
  }),
);

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    cloudflareTest(() =>
      Effect.runPromise(
        readMigrations.pipe(
          Effect.map((migrations) => ({
            main: "./src/app/server/index.ts",
            miniflare: {
              compatibilityDate: "2026-09-01",
              compatibilityFlags: ["nodejs_compat"],
              d1Databases: ["DB"],
              r2Buckets: ["SEARCH"],
              queueProducers: { INGEST: { queueName: "ingest" } },
              durableObjects: {
                GUILD_ARCHIVE: { className: "GuildArchive", useSQLite: true },
                REQUEST_COUNTER: { className: "RequestCounter", useSQLite: true },
                NEURON_BUDGET: { className: "NeuronBudget", useSQLite: true },
              },
              ai: { binding: "AI" },
              secretsStoreSecrets: { MASTER_KEY: { store_id: "test", secret_name: "master-key" } },
              bindings: {
                DISCORD_BOT_TOKEN: `${btoa("900")}.test.token`,
                DISCORD_CLIENT_ID: "test-client",
                DISCORD_CLIENT_SECRET: "test-client-secret",
                BETTER_AUTH_SECRET: "test-better-auth-secret-at-least-32-chars",
                TEST_MIGRATIONS: migrations,
              },
            },
          })),
        ),
      ),
    ),
  ],
  test: {
    setupFiles: ["./src/app/vitest.setup.ts"],
    fsModuleCache: false,
    deps: { optimizer: { ssr: { enabled: true, include: ["discord-api-types/v10"] } } },
  },
});
