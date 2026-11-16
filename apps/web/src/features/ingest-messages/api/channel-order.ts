import type { ChannelType } from "discord-api-types/v10";
import { Array, Order } from "effect";

import { VOICE_TYPES } from "#/features/ingest-messages/model/channel-kind";

export type Positioned = Readonly<{ id: string; type: ChannelType; position: number }>;

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

export const inDiscordOrder = <Channel extends Positioned>(
  channels: readonly Channel[],
): Channel[] => Array.sort(channels, DiscordOrder);
