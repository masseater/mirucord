import { env } from "cloudflare:workers";
import { Effect, Option, String } from "effect";

import {
  GEMMA_MODEL,
  gemmaNeurons,
  gemmaText,
  settleGemma,
  spendNeurons,
} from "#/shared/ai/index.server";
import type { GemmaOutput } from "#/shared/ai/index.server";

const MAX_TOKENS = 120;
const RESERVED_INPUT_TOKENS = 300;
const RESERVED_NEURONS = gemmaNeurons({ input: RESERVED_INPUT_TOKENS, output: MAX_TOKENS });
const HEDGE = "あるいは";

type Hedged = Readonly<{ label: string; note: string }>;

const promptOf = ({ label, note }: Hedged): string =>
  `次は用語集の「${label}」の説明です。「${HEDGE}」で二つの意味や場面を並べています。より多く当てはまりそうな一つに絞って、60字以内の1文に書き直してください。新しい情報は足さないでください。書き直した文だけを答えてください。
${note}`;

const rewrite = (hedged: Hedged): Effect.Effect<string> =>
  Effect.promise((): Promise<GemmaOutput> =>
    env.AI.run(GEMMA_MODEL, {
      messages: [{ role: "user", content: promptOf(hedged) }],
      max_tokens: MAX_TOKENS,
      chat_template_kwargs: { enable_thinking: false },
    }),
  ).pipe(
    Effect.tap((output) => settleGemma({ output, reserved: RESERVED_NEURONS })),
    Effect.map((output) =>
      gemmaText(output).pipe(
        Option.map(String.trim),
        Option.filter((text) => String.isNonEmpty(text) && !text.includes(HEDGE)),
        Option.getOrElse(() => hedged.note),
      ),
    ),
    Effect.withSpan("narrowPhraseNote"),
  );

const narrowNote = (hedged: Hedged): Effect.Effect<string> => {
  if (!hedged.note.includes(HEDGE)) {
    return Effect.succeed(hedged.note);
  }
  return spendNeurons("live", RESERVED_NEURONS).pipe(
    Effect.flatMap((granted) => {
      if (!granted) {
        return Effect.succeed(hedged.note);
      }
      return rewrite(hedged);
    }),
  );
};

export { narrowNote };
