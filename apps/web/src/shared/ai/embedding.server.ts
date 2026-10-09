import { env } from "cloudflare:workers";
import { Effect } from "effect";

const MODEL = "@cf/baai/bge-m3";

const embed = (texts: readonly string[]): Effect.Effect<readonly (readonly number[])[]> =>
  Effect.promise(() => env.AI.run(MODEL, { text: [...texts], truncate_inputs: true })).pipe(
    Effect.flatMap((output) => {
      if ("data" in output && output.data.length === texts.length) {
        return Effect.succeed(output.data);
      }
      return Effect.die(new Error(`${MODEL} returned no embeddings`));
    }),
  );

export { embed };
