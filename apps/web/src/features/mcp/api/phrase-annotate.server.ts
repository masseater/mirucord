import { env } from "cloudflare:workers";
import { Array, Effect, Layer, Option, Schema, String } from "effect";
import { FetchHttpClient, HttpClient } from "effect/http";
import { fromUint8Array } from "js-base64";

import type { Phrase } from "#/entities/guild-message/index.server";
import {
  GEMMA_MODEL,
  gemmaNeurons,
  gemmaText,
  settleGemma,
  spendNeurons,
} from "#/shared/ai/index.server";
import type { GemmaOutput } from "#/shared/ai/index.server";
import type { MessageBody } from "#/shared/crypto/index.server";

const MAX_TOKENS = 240;
const RESERVED_INPUT_TOKENS = 3000;
const RESERVED_NEURONS = gemmaNeurons({ input: RESERVED_INPUT_TOKENS, output: MAX_TOKENS });
const EXCERPT_LENGTH = 100;
const FIRST = 0;
const OK_STATUS = 200;
const SHORTEST_NAME = 2;
const SPEAKERS = "ABCDEFGHIJ";
const OTHER_SPEAKER = "他";
const NUMBER_FROM = 1;
const EMOJI_PREFIX = "emoji:";
const JSON_OBJECT = /\{[\s\S]*\}/u;

type NoteSubject = Readonly<{ phrase: string; label: Phrase; uses: number; people: number }>;

type OpenedSample = Readonly<{
  before: readonly MessageBody[];
  use: MessageBody;
  after: readonly MessageBody[];
}>;

type NoteInput = NoteSubject & Readonly<{ samples: readonly OpenedSample[] }>;

type Note =
  | Readonly<{ status: "common" }>
  | Readonly<{ status: "server"; note: string | null }>
  | Readonly<{ status: "unknown" }>;

const Answer = Schema.fromJsonString(
  Schema.Struct({ type: Schema.Literals(["common", "server"]), note: Schema.String }),
);
const decodeAnswer = Schema.decodeUnknownOption(Answer);

type Answered = typeof Answer.Type;

type Image = Readonly<{ data: string; contentType: string }>;

const excerptOf = ({ content, stickers }: MessageBody): string =>
  [content, ...stickers.map((name) => `[sticker: ${name}]`)]
    .filter((text) => String.isNonEmpty(text))
    .join(" ")
    .slice(FIRST, EXCERPT_LENGTH);

const speakerOf =
  (names: readonly string[]) =>
  ({ authorName }: MessageBody): string =>
    SPEAKERS.at(names.indexOf(authorName)) ?? OTHER_SPEAKER;

const lineOf = (speaker: string, body: MessageBody, mark: string): string =>
  `${mark}${speaker}: ${excerptOf(body).replaceAll("\n", " ")}`;

const sampleText = ({ before, use, after }: OpenedSample, index: number): string => {
  const names = Array.dedupe([...before, use, ...after].map(({ authorName }) => authorName));
  const speaker = speakerOf(names);
  return [
    `例${index + NUMBER_FROM}`,
    ...before.map((body) => lineOf(speaker(body), body, "  ")),
    lineOf(speaker(use), use, "▶ "),
    ...after.map((body) => lineOf(speaker(body), body, "  ")),
  ].join("\n");
};

const promptOf = ({ label, uses, people, samples }: NoteInput): string => {
  const examples = samples.map((sample, index) => sampleText(sample, index)).join("\n\n");
  const subject = Option.match(
    Option.liftPredicate(label.kind, (kind) => kind === "emoji"),
    {
      onNone: () => `言葉「${label.label}」（種類: ${label.kind}）`,
      onSome: () => `添付画像のカスタム絵文字「${label.label}」`,
    },
  );
  return `あなたはDiscordサーバーの会話を読むAIのために、サーバー内でよく使われる言葉の用語集を作っています。
${subject}は、このサーバーで${uses}回、${people}人が使いました。
使用例を前後の発言と一緒に示します。▶が対象を含む発言です。発言者は例ごとにA、Bなどの仮名にしています。

${examples}

まず、これがどのサーバーでも普通に使う一般的な言葉・相づち・挨拶・数字なら common、このサーバー独自の意味や使われ方があるなら server と判定してください。
server なら、用語集の見出しの説明として note を書きます。
- 何を受けて使われ、何を表すかを言い切る。反応に使う絵文字や言葉は、▶の直前の発言の内容から、どんな発言にどんな気持ちで返しているかを読み取って書く。
- 毎回直後に決まった形の返答が来るなら、ボットのコマンドとして「〇〇を返すボットのコマンド」と書く。
- 絵文字なら、最初に見た目を短く書く。絵文字の名前や言葉そのものも手がかりにする。
- 60字以内。「あるいは」「様々な」「など」「相槌や反応として」のような、どの言葉にも当てはまる書き方をしない。
- 例をすべて読んでも共通点が一つも見つからないときだけ「意味は不明」と書く。
- 人物の名前や仮名、人物の評価、使用例にない固有名は書かない。
良い note の例（別のサーバーの言葉）:
- 「ﾜｶﾙ」: 相手の愚痴や体験談に強く共感したときに返す相づち。
- 「:pien:」: 涙目の顔の絵文字。失敗や残念な報告を受けて同情を示す。
- 「!roll」: サイコロの目を返すボットのコマンド。
次のJSONだけを答えてください: {"type":"common"か"server","note":"serverなら説明、commonなら空文字"}`;
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

const answerOf = (output: GemmaOutput): Option.Option<Answered> =>
  gemmaText(output).pipe(
    Option.flatMap((content) => Option.fromNullishOr(JSON_OBJECT.exec(content))),
    Option.flatMap(([json]) => decodeAnswer(json)),
  );

const askModel = (prompt: string, image: Option.Option<Image>): Effect.Effect<GemmaOutput> =>
  Effect.promise((): Promise<GemmaOutput> =>
    env.AI.run(GEMMA_MODEL, {
      messages: [{ role: "user", content: [...contentOf(prompt, image)] }],
      max_tokens: MAX_TOKENS,
      chat_template_kwargs: { enable_thinking: false },
    }),
  ).pipe(Effect.withSpan("annotatePhrase"));

const namesIn = (input: NoteInput): readonly string[] =>
  input.samples
    .flatMap(({ before, use, after }) => [...before, use, ...after])
    .map(({ authorName }) => authorName)
    .filter((name) => Array.fromIterable(name).length >= SHORTEST_NAME);

const noteOf = (input: NoteInput, { type, note }: Answered): Note => {
  if (type === "common") {
    return { status: "common" };
  }
  const trimmed = String.trim(note);
  const unlabelled = trimmed.replaceAll(input.label.label, "");
  const named = namesIn(input).some((name) => unlabelled.includes(name));
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
              Effect.tap((output) => settleGemma({ output, reserved: RESERVED_NEURONS })),
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
export type { Note, NoteInput, NoteSubject, OpenedSample };
