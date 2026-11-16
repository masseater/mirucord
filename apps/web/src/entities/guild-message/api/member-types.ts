export type StoredMember = Readonly<{
  userId: string;
  sealed: string;
  roles: readonly string[];
  bot: boolean;
  joinedAt: number | null;
  leftAt: number | null;
}>;

export type MemberWrite = Readonly<{
  members: readonly Omit<StoredMember, "leftAt">[];
  now: number;
  coverage: "complete" | "partial";
}>;

export type MemberLookup = Readonly<{ userIds: readonly string[] | null; includeLeft: boolean }>;
