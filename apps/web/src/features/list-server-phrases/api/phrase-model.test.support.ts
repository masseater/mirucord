import { run } from "@r_masseater/workers-tracing/effect";
import { env } from "cloudflare:workers";
import { Array, Effect, Option, pipe, Schema, String as Str } from "effect";
import { vi } from "vite-plus/test";

import { GUILD_A, userToolCaller } from "#/entities/guild-message/index.test.support";
import { ListServerPhrasesOutput } from "#/features/list-server-phrases/model/server-phrases-output";

import { registerListServerPhrases } from "./list-server-phrases.server";

const callTool = userToolCaller([registerListServerPhrases]);

export type ModelAnswers = Readonly<{ common: string; note: string }>;

export const prompts: string[] = [];

const decodePhrases = Schema.decodeUnknownEffect(ListServerPhrasesOutput);

export const listPhrases = callTool({
  name: "list_server_phrases",
  args: { serverId: GUILD_A },
}).pipe(
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

export const mockPhraseModel = (answers: ModelAnswers): void => {
  vi.spyOn(env.AI, "run").mockImplementation((_model, inputs) => run(answerModel(answers, inputs)));
};
