import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { afterEach, beforeAll, beforeEach, vi } from "vite-plus/test";

const stubMasterKey = (): void => {
  vi.spyOn(env.MASTER_KEY, "get").mockResolvedValue("master-key-for-tests");
};

beforeAll(() => {
  stubMasterKey();
  return applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(stubMasterKey);

afterEach(() => {
  vi.restoreAllMocks();
});
