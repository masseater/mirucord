import { env } from "cloudflare:workers";
import { Array, Effect, Layer, Option, Schema, String } from "effect";
import { FetchHttpClient, HttpClient } from "effect/http";
import { fromUint8Array } from "js-base64";

import type { Phrase } from "#/entities/guild-message/index.server";
import { GEMMA_MODEL, gemmaNeurons, settleNeurons, spendNeurons } from "#/shared/ai/index.server";
import type { MessageBody } from "#/shared/crypto/index.server";

const MAX_TOKENS = 200;
const RESERVED_INPUT_TOKENS = 1000;
const RESERVED_NEURONS = gemmaNeurons({ input: RESERVED_INPUT_TOKENS, output: MAX_TOKENS });
const EXCERPT_LENGTH = 100;
const FIRST = 0;
const OK_STATUS = 200;
const SHORTEST_NAME = 2;
const EMOJI_PREFIX = "emoji:";
const JSON_OBJECT = /\{[\s\S]*\}/u;

type NoteInput = Readonly<{
  phrase: string;
  label: Phrase;
  uses: number;
  people: number;
  examples: readonly string[];
  contexts: readonly (readonly MessageBody[])[];
}>;

type Note =
  | Readonly<{ status: "common" }>
  | Readonly<{ status: "server"; note: string | null }>
  | Readonly<{ status: "unknown" }>;

const Answer = Schema.fromJsonString(
  Schema.Struct({ type: Schema.Literals(["common", "server"]), note: Schema.String }),
);
const decodeAnswer = Schema.decodeUnknownOption(Answer);

type Answered = typeof Answer.Type;

type ModelOutput = Readonly<{
  choices: readonly Readonly<{ message: Readonly<{ content?: string | null }> }>[];
  usage?: Readonly<{ prompt_tokens: number; completion_tokens: number }>;
}>;

type Image = Readonly<{ data: string; contentType: string }>;

const excerptOf = ({ content, stickers }: MessageBody): string =>
  [content, ...stickers.map((name) => `[sticker: ${name}]`)]
    .filter((text) => String.isNonEmpty(text))
    .join(" ")
    .slice(FIRST, EXCERPT_LENGTH);

const contextOf = (bodies: readonly MessageBody[]): string =>
  bodies.map((body) => excerptOf(body).replaceAll("\n", " ")).join(" → ");

const promptOf = ({ label, uses, people, contexts }: NoteInput): string => {
  const examples = contexts.map((bodies) => `- ${contextOf(bodies)}`).join("\n");
  const subject = Option.match(
    Option.liftPredicate(label.kind, (kind) => kind === "emoji"),
    {
      onNone: () => `言葉「${label.label}」（種類: ${label.kind}）`,
      onSome: () => `添付画像のカスタム絵文字「${label.label}」`,
    },
  );
  return `あなたはDiscordサーバーの会話を読むAIのために、サーバー内でよく使われる言葉の用語集を作っています。
${subject}は、このサーバーで${uses}回、${people}人が使いました。直前の発言から順に使用例を示します。
${examples}
これが、どのサーバーでも普通に使う一般的な言葉・相づち・挨拶か、このサーバー独自の使われ方をするもの（内輪ネタ、独自の絵文字、コマンド、定番の掛け合いなど）かを判定してください。
独自のものなら、このサーバーでの使われ方を日本語で1文で書いてください。絵文字なら見た目も添えてください。使用例や画像から読み取れないことは推測で書かず、意味が分からなければ「意味は不明、〜のときに使う」のように書いてください。人物の名前や人物の評価は書かないでください。
次のJSONだけを答えてください: {"type":"common"か"server","note":"独自のものの説明。一般的な言葉なら空文字"}`;
};

const withFetchClient = <Value>(
  effect: Effect.Effect<Value, never, HttpClient.HttpClient>,
): Effect.Effect<Value> =>
  Effect.scoped(
    Layer.build(FetchHttpClient.layer).pipe(
      Effect.flatMap((context) => effect.pipe(Effect.provideContext(context))),
    ),
  );

const emojiUrl = (key: string): string =>
  `https://cdn.discordapp.com/emojis/${key.slice(EMOJI_PREFIX.length)}.png?size=128`;

const emojiImage = ({ key }: Phrase): Effect.Effect<Option.Option<Image>> =>
  Option.match(
    Option.liftPredicate(key, (value) => value.startsWith(EMOJI_PREFIX)),
    {
      onNone: () => Effect.succeedNone,
      onSome: (value) =>
        HttpClient.HttpClient.pipe(
          Effect.flatMap((client) => client.get(emojiUrl(value))),
          Effect.filterOrFail(({ status }) => status === OK_STATUS),
          Effect.flatMap((response) => response.arrayBuffer),
          Effect.map((buffer) =>
            Option.some({ data: fromUint8Array(new Uint8Array(buffer)), contentType: "image/png" }),
          ),
          Effect.orElseSucceed(() => Option.none<Image>()),
          withFetchClient,
          Effect.withSpan("fetchEmojiImage"),
        ),
    },
  );

type ContentPart =
  | Readonly<{ type: "text"; text: string }>
  | Readonly<{ type: "image_url"; image_url: Readonly<{ url: string }> }>;

const contentOf = (prompt: string, image: Option.Option<Image>): readonly ContentPart[] => [
  { type: "text" as const, text: prompt },
  ...Option.toArray(image).map(({ data, contentType }) => ({
    type: "image_url" as const,
    image_url: { url: `data:${contentType};base64,${data}` },
  })),
];

const settleUsage = ({ usage }: ModelOutput): Effect.Effect<void> =>
  Option.match(Option.fromUndefinedOr(usage), {
    onNone: () => Effect.void,
    onSome: ({ prompt_tokens, completion_tokens }) =>
      settleNeurons(
        gemmaNeurons({ input: prompt_tokens, output: completion_tokens }) - RESERVED_NEURONS,
      ),
  });

const answerOf = ({ choices }: ModelOutput): Option.Option<Answered> =>
  Array.head(choices).pipe(
    Option.flatMap(({ message }) => Option.fromNullishOr(message.content)),
    Option.flatMap((content) => Option.fromNullishOr(JSON_OBJECT.exec(content))),
    Option.flatMap(([json]) => decodeAnswer(json)),
  );

const askModel = (prompt: string, image: Option.Option<Image>): Effect.Effect<ModelOutput> =>
  Effect.promise((): Promise<ModelOutput> =>
    env.AI.run(GEMMA_MODEL, {
      messages: [{ role: "user", content: [...contentOf(prompt, image)] }],
      max_tokens: MAX_TOKENS,
      chat_template_kwargs: { enable_thinking: false },
    }),
  ).pipe(Effect.withSpan("annotatePhrase"));

const namesIn = (input: NoteInput): readonly string[] =>
  input.contexts
    .flat()
    .map(({ authorName }) => authorName)
    .filter((name) => Array.fromIterable(name).length >= SHORTEST_NAME);

const noteOf = (input: NoteInput, { type, note }: Answered): Note => {
  if (type === "common") {
    return { status: "common" };
  }
  const trimmed = String.trim(note);
  const named = namesIn(input).some((name) => trimmed.includes(name));
  const shown = Option.liftPredicate(trimmed, (text) => String.isNonEmpty(text) && !named);
  return { status: "server", note: Option.getOrNull(shown) };
};

const annotatePhrase = (input: NoteInput): Effect.Effect<Option.Option<Note>> =>
  spendNeurons("live", RESERVED_NEURONS).pipe(
    Effect.flatMap((granted) =>
      Option.match(
        Option.liftPredicate(granted, (value) => value),
        {
          onNone: () => Effect.succeedNone,
          onSome: () =>
            emojiImage(input.label).pipe(
              Effect.flatMap((image) => askModel(promptOf(input), image)),
              Effect.tap((output) => settleUsage(output)),
              Effect.map((output) =>
                Option.map(answerOf(output), (answer) => noteOf(input, answer)),
              ),
            ),
        },
      ),
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Could not annotate a phrase", cause).pipe(Effect.as(Option.none<Note>())),
    ),
  );

export { annotatePhrase, excerptOf };
export type { Note, NoteInput };
