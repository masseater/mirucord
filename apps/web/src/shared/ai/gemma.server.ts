const GEMMA_MODEL = "@cf/google/gemma-4-26b-a4b-it";
const INPUT_NEURONS_PER_MILLION = 9091;
const OUTPUT_NEURONS_PER_MILLION = 27_273;
const MILLION = 1_000_000;

type Tokens = Readonly<{ input: number; output: number }>;

const gemmaNeurons = ({ input, output }: Tokens): number =>
  (input * INPUT_NEURONS_PER_MILLION + output * OUTPUT_NEURONS_PER_MILLION) / MILLION;

export { GEMMA_MODEL, gemmaNeurons };
export type { Tokens };
