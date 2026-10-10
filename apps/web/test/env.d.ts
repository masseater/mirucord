import type { D1Migration } from "cloudflare:test";

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}
