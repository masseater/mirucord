import { Function, Option } from "effect";

const DATA_FIRST_ARITY = 2;

type ConsentScope =
  | Readonly<{ status: "awaiting" }>
  | Readonly<{ status: "granted"; channelIds: readonly string[] }>;

type ScopedChannel = Readonly<{ id: string; parentId: string | null }>;

const isInScopeDataFirst = (scope: ConsentScope, { id, parentId }: ScopedChannel): boolean => {
  if (scope.status === "awaiting") {
    return false;
  }
  return (
    scope.channelIds.includes(id) ||
    Option.exists(Option.fromNullOr(parentId), (parent) => scope.channelIds.includes(parent))
  );
};

const isInScope: {
  (channel: ScopedChannel): (scope: ConsentScope) => boolean;
  (scope: ConsentScope, channel: ScopedChannel): boolean;
} = Function.dual(DATA_FIRST_ARITY, isInScopeDataFirst);

export { isInScope };
export type { ConsentScope, ScopedChannel };
