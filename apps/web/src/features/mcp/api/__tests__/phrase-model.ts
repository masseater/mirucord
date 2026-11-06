import { env } from "cloudflare:workers";
import { Array, Effect, Option, pipe, Schema, String as Str } from "effect";
import { vi } from "vite-plus/test";

import { ListServerPhrasesOutput } from "#/features/mcp/api/tool-output";

import { GUILD_A } from "./scenario";
import { callTool } from "./tool-call";

type ModelAnswers = Readonly<{ common: string; note: string }>;

const prompts: string[] = [];

const decodePhrases = Schema.decodeUnknownEffect(ListServerPhrasesOutput);

const listPhrases = callTool({ name: "list_server_phrases", args: { serverId: GUILD_A } }).pipe(
  Effect.flatMap(({ structured }) => decodePhrases(Option.getOrUndefined(structured))),
  Effect.map(({ phrases }) => phrases),
  Effect.orDie,
);

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

type ModelReply = Readonly<{ choices: readonly Readonly<{ message: { content: string } }>[] }>;

const answerFor = (
  { common, note }: ModelAnswers,
  prompt: string,
): Effect.Effect<string, Schema.SchemaError> => {
  if (pipe(prompt, Str.includes(`「${common}」`))) {
    return encodeJson({ type: "common", note: "" });
  }
  return encodeJson({ type: "server", note });
};

const answerModel = (answers: ModelAnswers, inputs: unknown): Effect.Effect<ModelReply> =>
  Effect.gen(function* answered() {
    const prompt = yield* encodeJson(inputs);
    prompts.push(prompt);
    const answer = yield* answerFor(answers, prompt);
    const content = pipe(["```json", answer, "```"], Array.join("\n"));
    return { choices: [{ message: { content } }] };
  }).pipe(Effect.orDie);

const mockPhraseModel = (answers: ModelAnswers): void => {
  vi.spyOn(env.AI, "run").mockImplementation((_model, inputs) =>
    Effect.runPromise(answerModel(answers, inputs)),
  );
};

export { listPhrases, mockPhraseModel, prompts };
export type { ModelAnswers };
