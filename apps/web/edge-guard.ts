import { ENV_PREFIX, PREFIX } from "@repo/shared-util-app-name";
import { adopt } from "alchemy/AdoptPolicy";
import { AnalyticsEngine, Ruleset, Workers, Zone } from "alchemy/Cloudflare";
import type { InferEnv } from "alchemy/Cloudflare";
import { Effect } from "effect";

const SCANNER_PATH_FRAGMENTS = [
  ".php",
  ".asp",
  ".jsp",
  ".cgi",
  ".sql",
  ".bak",
  "/wp-",
  "/cgi-bin/",
  "/phpmyadmin",
  "/actuator",
  "/vendor/",
] as const;

const HONEYPOT_PATHS = ["/.env", "/wp-login.php"] as const;

const PATH = "lower(http.request.uri.path)";

const scannerExpression = (domain: string): string => {
  const honeypot = `(http.host eq "${domain}" and http.request.uri.path in {${HONEYPOT_PATHS.map((path) => `"${path}"`).join(" ")}})`;
  const probes = [
    ...SCANNER_PATH_FRAGMENTS.map((fragment) => `${PATH} contains "${fragment}"`),
    `(${PATH} contains "/." and not starts_with(${PATH}, "/.well-known/"))`,
  ].join(" or ");
  return `(${probes}) and not ${honeypot}`;
};

const honeypot = Effect.fn("honeypot")(function* honeypot(domain: string) {
  const HONEYPOT = yield* AnalyticsEngine.Dataset("Honeypot", {
    dataset: `${ENV_PREFIX}honeypot`,
  });
  return yield* Workers.Worker("Honeypot", {
    name: `${PREFIX}honeypot`,
    main: "./honeypot.worker.ts",
    env: { HONEYPOT },
    routes: HONEYPOT_PATHS.map((path) => ({ pattern: `${domain}${path}`, zoneName: domain })),
  });
});

const edgeGuard = Effect.fn("edgeGuard")(function* edgeGuard(domain: string) {
  const zone = yield* Zone.Zone("Zone", { name: domain }).pipe(adopt(true));
  yield* Ruleset.Ruleset("ScannerBlock", {
    zone,
    name: `${PREFIX}scanner-block`,
    phase: "http_request_firewall_custom",
    rules: [
      {
        description: "Block vulnerability scanner probes",
        expression: scannerExpression(domain),
        action: "block",
      },
    ],
  });
  return yield* honeypot(domain);
});

type HoneypotEnv = InferEnv<ReturnType<typeof honeypot>>;

export type { HoneypotEnv };
export { edgeGuard };
