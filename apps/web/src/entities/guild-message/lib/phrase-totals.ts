import { Array, Number, Option, Order, pipe, Record } from "effect";

const LONG_AGO = 0;
const TOP_CHANNELS = 2;

type TallyRow = Readonly<{
  phrase: string;
  common: string;
  channelId: string;
  authorId: string;
  uses: number;
  lastUsedAt: number | null;
}>;

type PhraseTotal = Readonly<{
  phrase: string;
  common: string;
  uses: number;
  people: number;
  lastUsedAt: number;
  channels: readonly Readonly<{ channelId: string; uses: number }>[];
}>;

const usesOf = (rows: readonly TallyRow[]): number =>
  Number.sumAll(
    pipe(
      rows,
      Array.map(({ uses }) => uses),
    ),
  );

const byUses = Order.mapInput(
  Order.flip(Order.Number),
  ({ uses }: Readonly<{ uses: number }>) => uses,
);

const totalOf = (rows: Array.NonEmptyReadonlyArray<TallyRow>): PhraseTotal => {
  const [{ phrase, common }] = rows;
  return {
    phrase,
    common,
    uses: usesOf(rows),
    people: new Set(
      pipe(
        rows,
        Array.map(({ authorId }) => authorId),
      ),
    ).size,
    lastUsedAt: Array.reduce(rows, LONG_AGO, (latest, row) =>
      Number.max(
        latest,
        Option.getOrElse(Option.fromNullOr(row.lastUsedAt), () => LONG_AGO),
      ),
    ),
    channels: pipe(
      Array.groupBy(rows, ({ channelId }) => channelId),
      Record.toEntries,
      Array.map(([channelId, inChannel]) => ({ channelId, uses: usesOf(inChannel) })),
      (channels) => Array.sort(channels, byUses),
      Array.take(TOP_CHANNELS),
    ),
  };
};

const phraseTotals = (rows: readonly TallyRow[]): readonly PhraseTotal[] =>
  pipe(
    Record.values(Array.groupBy(rows, ({ phrase }) => phrase)),
    Array.map((group) => totalOf(group)),
  );

export { phraseTotals };
export type { PhraseTotal, TallyRow };
