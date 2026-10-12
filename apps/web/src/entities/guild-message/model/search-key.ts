import { DiscordSnowflake } from "@sapphire/snowflake";

const INCREMENT_SLOTS = 1024n;

const searchKeyOf = (messageId: string): number => {
  const { timestamp, epoch, increment } = DiscordSnowflake.deconstruct(messageId);
  const elapsed = timestamp - epoch;
  return Number(elapsed * INCREMENT_SLOTS + (increment % INCREMENT_SLOTS));
};

export { searchKeyOf };
