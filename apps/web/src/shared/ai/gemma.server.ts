import { Array, Effect, Option } from "effect";

import { settleNeurons } from "./budget.server";

const GEMMA_MODEL = "@cf/google/gemma-4-26b-a4b-it";
const INPUT_NEURONS_PER_MILLION = 9091;
const OUTPUT_NEURONS_PER_MILLION = 27_273;
const MILLION = 1_000_000;

type Tokens = Readonly<{ input: number; output: number }>;

const gemmaNeurons = ({ input, output }: Tokens): number =>
  (input * INPUT_NEURONS_PER_MILLION + output * OUTPUT_NEURONS_PER_MILLION) / MILLION;

type GemmaOutput = Readonly<{
  choices: readonly Readonly<{ message: Readonly<{ content?: string | null }> }>[];
  usage?: Readonly<{ prompt_tokens: number; completion_tokens: number }>;
}>;

type Settlement = Readonly<{ output: GemmaOutput; reserved: number }>;

const settleGemma = ({ output, reserved }: Settlement): Effect.Effect<void> =>
  Option.match(Option.fromUndefinedOr(output.usage), {
    onNone: () => Effect.void,
    onSome: ({ prompt_tokens, completion_tokens }) =>
      settleNeurons(gemmaNeurons({ input: prompt_tokens, output: completion_tokens }) - reserved),
  });

const gemmaText = ({ choices }: GemmaOutput): Option.Option<string> =>
  Array.head(choices).pipe(Option.flatMap(({ message }) => Option.fromNullishOr(message.content)));

export { GEMMA_MODEL, gemmaNeurons, gemmaText, settleGemma };
export type { GemmaOutput, Settlement, Tokens };
