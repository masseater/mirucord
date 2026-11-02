import { Array, pipe } from "effect";

import type {
  ConnectionKey,
  LinkedChoice,
} from "#/pages/dashboard/api/linked-account-store.server";

type LinkedDraft =
  | Readonly<{ status: "untouched" }>
  | Readonly<{ status: "edited"; selected: readonly string[] }>;

const UNTOUCHED_LINKS: LinkedDraft = { status: "untouched" };

const connectionKeyOf = ({ type, name }: ConnectionKey): string => `${type}/${name}`;

const selectedKeysOf =
  (choices: readonly LinkedChoice[]) =>
  (draft: LinkedDraft): readonly string[] => {
    if (draft.status === "edited") {
      return draft.selected;
    }
    return pipe(
      choices,
      Array.filter(({ published }) => published),
      Array.map(connectionKeyOf),
    );
  };

const toggledKeys =
  (selected: readonly string[]) =>
  (key: string): readonly string[] => {
    if (Array.contains(selected, key)) {
      return pipe(
        selected,
        Array.filter((kept) => kept !== key),
      );
    }
    return Array.append(selected, key);
  };

const chosenConnections =
  (choices: readonly LinkedChoice[]) =>
  (selected: readonly string[]): readonly ConnectionKey[] =>
    pipe(
      choices,
      Array.filter((choice) => Array.contains(selected, connectionKeyOf(choice))),
      Array.map(({ type, name }) => ({ type, name })),
    );

export { chosenConnections, connectionKeyOf, selectedKeysOf, toggledKeys, UNTOUCHED_LINKS };
export type { LinkedDraft };
