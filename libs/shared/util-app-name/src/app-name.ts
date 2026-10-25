import { pipe, String as Str } from "effect";

const APP_NAME = "mirucord";

const prefixesOf = (name: string): Readonly<{ prefix: string; envPrefix: string }> => ({
  prefix: `${name}-`,
  envPrefix: `${pipe(name, Str.replaceAll("-", "_"))}_`,
});

const { prefix: PREFIX, envPrefix: ENV_PREFIX } = prefixesOf(APP_NAME);

export { APP_NAME, ENV_PREFIX, PREFIX, prefixesOf };
