import { Array, Option, Order } from "effect";

const SnowflakeOrder: Order.Order<string> = Order.mapInput(Order.BigInt, BigInt);

const newestId = (ids: readonly string[]): Option.Option<string> =>
  Array.match(ids, {
    onEmpty: () => Option.none(),
    onNonEmpty: (nonEmpty) => Option.some(Array.max(nonEmpty, SnowflakeOrder)),
  });

const oldestId = (ids: readonly string[]): Option.Option<string> =>
  Array.match(ids, {
    onEmpty: () => Option.none(),
    onNonEmpty: (nonEmpty) => Option.some(Array.min(nonEmpty, SnowflakeOrder)),
  });

const isNewerThan = Order.isGreaterThan(SnowflakeOrder);

export { isNewerThan, newestId, oldestId };
