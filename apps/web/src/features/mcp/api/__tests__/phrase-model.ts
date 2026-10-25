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

const answerFor = ({ common, note }: ModelAnswers, prompt: string): string => {
  if (pipe(prompt, Str.includes(`「${common}」`))) {
    return JSON.stringify({ type: "common", note: "" });
  }
  return JSON.stringify({ type: "server", note });
};

const mockPhraseModel = (answers: ModelAnswers): void => {
  vi.spyOn(env.AI, "run").mockImplementation((_model, inputs) => {
    const prompt = JSON.stringify(inputs);
    prompts.push(prompt);
    const content = pipe(["```json", answerFor(answers, prompt), "```"], Array.join("\n"));
    return Promise.resolve({ choices: [{ message: { content } }] });
  });
};

export { listPhrases, mockPhraseModel, prompts };
export type { ModelAnswers };
