import type { WebEnv } from "./alchemy.run.ts";

type BoundEnv = Omit<WebEnv, "MESSAGES" | "MASTER_KEY"> &
  Readonly<{
    MESSAGES: Vectorize;
    MASTER_KEY: SecretsStoreSecret;
    MASTER_KEY_PREVIOUS?: SecretsStoreSecret;
  }>;

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env extends BoundEnv {}
  }
}
