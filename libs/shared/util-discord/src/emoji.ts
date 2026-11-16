import { Option, Schema } from "effect";

const NO_NAME = "";

export const Emoji = Schema.Struct({
  id: Schema.NullOr(Schema.String),
  name: Schema.NullOr(Schema.String),
});

export type EmojiData = typeof Emoji.Type;

export const emojiKeyOf = ({ id, name }: EmojiData): string => {
  const label = Option.getOrElse(Option.fromNullOr(name), () => NO_NAME);
  return Option.match(Option.fromNullOr(id), {
    onNone: () => label,
    onSome: (emojiId) => `${label}:${emojiId}`,
  });
};
