import { Array, pipe } from "effect";

import type {
  ConnectionKey,
  LinkedChoice,
} from "#/pages/dashboard/api/linked-account-store.server";

export type LinkedDraft =
  | Readonly<{ status: "untouched" }>
  | Readonly<{ status: "edited"; selected: readonly string[] }>;

export const UNTOUCHED_LINKS: LinkedDraft = { status: "untouched" };

export const connectionKeyOf = ({ type, name }: ConnectionKey): string => `${type}/${name}`;

export const selectedKeysOf =
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

export const toggledKeys =
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

export const chosenConnections =
  (choices: readonly LinkedChoice[]) =>
  (selected: readonly string[]): readonly ConnectionKey[] =>
    pipe(
      choices,
      Array.filter((choice) => Array.contains(selected, connectionKeyOf(choice))),
      Array.map(({ type, name }) => ({ type, name })),
    );
