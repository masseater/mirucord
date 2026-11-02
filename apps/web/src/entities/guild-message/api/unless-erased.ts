const unlessErased =
  <Item extends Readonly<{ kind: string }>>(apply: (change: Item) => void) =>
  (changes: readonly Item[], erased: readonly string[]): void => {
    for (const change of changes) {
      if (
        !("userId" in change) ||
        typeof change.userId !== "string" ||
        !erased.includes(change.userId)
      ) {
        apply(change);
      }
    }
  };

export { unlessErased };
