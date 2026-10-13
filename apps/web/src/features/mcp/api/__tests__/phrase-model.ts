import { env } from "cloudflare:workers";
import { Effect, Option, Schema } from "effect";
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
  if (prompt.includes(`「${common}」`)) {
    return JSON.stringify({ type: "common", note: "" });
  }
  return JSON.stringify({ type: "server", note });
};

const mockPhraseModel = (answers: ModelAnswers): void => {
  vi.spyOn(env.AI, "run").mockImplementation((_model, inputs) => {
    const prompt = JSON.stringify(inputs);
    prompts.push(prompt);
    const content = ["```json", answerFor(answers, prompt), "```"].join("\n");
    return Promise.resolve({ choices: [{ message: { content } }] });
  });
};

export { listPhrases, mockPhraseModel, prompts };
export type { ModelAnswers };
