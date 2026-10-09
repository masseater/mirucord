import type { WebEnv } from "./alchemy.run.ts";

type BoundEnv = Omit<WebEnv, "MESSAGES"> & Readonly<{ MESSAGES: Vectorize }>;

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env extends BoundEnv {}
  }
}
