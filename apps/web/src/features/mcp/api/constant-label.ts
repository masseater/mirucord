import { Option, pipe, Record, String as Str } from "effect";

const UNKNOWN = "unknown";

const labelOf =
  (names: Readonly<Record<string, number>>) =>
  (value: number): string =>
    pipe(
      Record.findFirst(names, (known) => known === value),
      Option.map(([name]) => Str.toLowerCase(name)),
      Option.getOrElse(() => UNKNOWN),
    );

const valueOf =
  (names: Readonly<Record<string, number>>) =>
  (label: string): Option.Option<number> =>
    Record.get(names, Str.toUpperCase(label));

export { labelOf, valueOf };
