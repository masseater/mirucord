import { Array, Order } from "effect";

import { VOICE_TYPES } from "#/features/ingest/model/channel-kind";

type Positioned = Readonly<{ id: string; type: number; position: number }>;

const byVoice: Order.Order<Positioned> = Order.mapInput(Order.Boolean, ({ type }: Positioned) =>
  VOICE_TYPES.has(type),
);
const byPosition: Order.Order<Positioned> = Order.mapInput(
  Order.Number,
  ({ position }: Positioned) => position,
);
const byId: Order.Order<Positioned> = Order.mapInput(Order.BigInt, ({ id }: Positioned) =>
  BigInt(id),
);

const DiscordOrder: Order.Order<Positioned> = Order.combine(
  Order.combine(byVoice, byPosition),
  byId,
);

const inDiscordOrder = <Channel extends Positioned>(channels: readonly Channel[]): Channel[] =>
  Array.sort(channels, DiscordOrder);

export { inDiscordOrder };
export type { Positioned };
