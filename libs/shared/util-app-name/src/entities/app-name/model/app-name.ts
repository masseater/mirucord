import { pipe, String as Str } from "effect";

export const APP_NAME = "mirucord";

export const prefixesOf = (name: string): Readonly<{ prefix: string; envPrefix: string }> => ({
  prefix: `${name}-`,
  envPrefix: `${pipe(name, Str.replaceAll("-", "_"))}_`,
});

export const { prefix: PREFIX, envPrefix: ENV_PREFIX } = prefixesOf(APP_NAME);
