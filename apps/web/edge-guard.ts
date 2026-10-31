import { AnalyticsEngine, Ruleset, Workers, Zone } from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { ENV_PREFIX, PREFIX } from "@repo/shared-util-app-name";
import { adopt } from "alchemy/AdoptPolicy";
import { Array, Effect, pipe, Record } from "effect";

import { SCANNER_PROBES } from "./scanner-probes.ts";

const HONEYPOT_PATHS = ["/.env", "/wp-login.php"] as const;

const PATH = "lower(http.request.uri.path)";

const quote = (value: string): string => `"${value}"`;

const SCANNER_CONDITIONS = {
  contains: [
    ...pipe(
      SCANNER_PROBES.contains,
      Array.map((fragment) => `${PATH} contains ${quote(fragment)}`),
    ),
    `(${PATH} contains "/." and not starts_with(${PATH}, "/.well-known/"))`,
  ],
  startsWith: pipe(
    SCANNER_PROBES.startsWith,
    Array.map((prefix) => `starts_with(${PATH}, ${quote(prefix)})`),
  ),
  endsWith: pipe(
    SCANNER_PROBES.endsWith,
    Array.map((suffix) => `ends_with(${PATH}, ${quote(suffix)})`),
  ),
  equals: pipe(
    SCANNER_PROBES.equals,
    Array.map((path) => `${PATH} eq ${quote(path)}`),
  ),
} as const;

const scannerRules = (domain: string): Ruleset.Rule[] => {
  const honeypot = `(http.host eq ${quote(domain)} and http.request.uri.path in {${pipe(
    HONEYPOT_PATHS,
    Array.map((path) => quote(path)),
    Array.join(" "),
  )}})`;
  return pipe(
    Record.toEntries(SCANNER_CONDITIONS),
    Array.map(([kind, conditions]) => ({
      description: `Block vulnerability scanner probes (${kind})`,
      expression: `(${pipe(conditions, Array.join(" or "))}) and not ${honeypot}`,
      action: "block",
    })),
  );
};

const honeypot = Effect.fn("honeypot")(function* honeypot(domain: string) {
  const HONEYPOT = yield* AnalyticsEngine.Dataset("Honeypot", {
    dataset: `${ENV_PREFIX}honeypot`,
  });
  return yield* Workers.Worker("Honeypot", {
    name: `${PREFIX}honeypot`,
    main: "./honeypot.worker.ts",
    logpush: true,
    env: { HONEYPOT },
    routes: pipe(
      HONEYPOT_PATHS,
      Array.map((path) => ({ pattern: `${domain}${path}`, zoneName: domain })),
    ),
  });
});

const edgeGuard = Effect.fn("edgeGuard")(function* edgeGuard(domain: string) {
  const zone = yield* Zone.Zone("Zone", { name: domain }).pipe(adopt(true));
  yield* Ruleset.Ruleset("ScannerBlock", {
    zone,
    name: `${PREFIX}scanner-block`,
    phase: "http_request_firewall_custom",
    rules: scannerRules(domain),
  });
  return yield* honeypot(domain);
});

type HoneypotEnv = InferEnv<ReturnType<typeof honeypot>>;

export type { HoneypotEnv };
export { edgeGuard };
