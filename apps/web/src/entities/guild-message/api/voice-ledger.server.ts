import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Option, Order, pipe } from "effect";

import { BOUND_LIMIT } from "#/entities/guild-message/model/guild-message.schema";
import { voiceSession } from "#/entities/guild-message/model/voice-session.schema";

import type {
  StoredVoiceSession,
  VoiceChangeWrite,
  VoiceLookup,
  VoicePage,
  VoiceSnapshotWrite,
} from "./voice-types";

type VoiceLedger = Readonly<{
  change: (changes: readonly VoiceChangeWrite[], erased: readonly string[]) => void;
  snapshot: (snapshot: VoiceSnapshotWrite, erased: readonly string[]) => void;
  read: (lookup: VoiceLookup, erased: readonly string[]) => VoicePage;
  forget: (userId: string) => void;
}>;

type OpenSession = Readonly<{ id: number; userId: string; channelId: string }>;

const OPEN_COLUMNS = {
  id: voiceSession.id,
  userId: voiceSession.userId,
  channelId: voiceSession.channelId,
};

const openOf = (db: DrizzleSqliteDODatabase, userId: string): Option.Option<OpenSession> => {
  const stillIn = and(eq(voiceSession.userId, userId), isNull(voiceSession.leftAt));
  return Option.fromUndefinedOr(db.select(OPEN_COLUMNS).from(voiceSession).where(stillIn).get());
};

type Seat = Readonly<{ userId: string; channelId: string }>;

const seatKeyOf = ({ userId, channelId }: Seat): string => `${userId}/${channelId}`;

const closeOf = (
  db: DrizzleSqliteDODatabase,
  id: number,
  left: StoredVoiceSession["joined"],
): void => {
  db.update(voiceSession)
    .set({ leftAt: left.at, leavePrecision: left.precision })
    .where(eq(voiceSession.id, id))
    .run();
};

const openAt = (
  db: DrizzleSqliteDODatabase,
  { userId, channelId }: Seat,
  joined: StoredVoiceSession["joined"],
): void => {
  db.insert(voiceSession)
    .values({ userId, channelId, joinedAt: joined.at, joinPrecision: joined.precision })
    .run();
};

const changeOf = (
  db: DrizzleSqliteDODatabase,
  { userId, channelId, at }: VoiceChangeWrite,
): void => {
  const open = openOf(db, userId);
  const stays = Option.exists(open, (session) => session.channelId === channelId);
  if (stays) {
    return;
  }
  const exact = { at, precision: "exact" } as const;
  for (const session of Option.toArray(open)) {
    closeOf(db, session.id, exact);
  }
  for (const joined of Option.toArray(Option.fromNullOr(channelId))) {
    openAt(db, { userId, channelId: joined }, exact);
  }
};

const snapshotOf = (
  db: DrizzleSqliteDODatabase,
  { at, present }: VoiceSnapshotWrite,
  erased: readonly string[],
): void => {
  const seen = { at, precision: "noLaterThan" } as const;
  const open = db.select(OPEN_COLUMNS).from(voiceSession).where(isNull(voiceSession.leftAt)).all();
  const presentKeys = new Set(pipe(present, Array.map(seatKeyOf)));
  const openKeys = new Set(pipe(open, Array.map(seatKeyOf)));
  const gone = pipe(
    open,
    Array.filter((session) => !presentKeys.has(seatKeyOf(session))),
  );
  const arrived = pipe(
    present,
    Array.filter((seat) => !openKeys.has(seatKeyOf(seat)) && !erased.includes(seat.userId)),
  );
  for (const session of gone) {
    closeOf(db, session.id, seen);
  }
  for (const seat of arrived) {
    openAt(db, seat, seen);
  }
};

type SessionRow = Readonly<typeof voiceSession.$inferSelect>;

const sessionOf = ({
  userId,
  channelId,
  joinedAt,
  joinPrecision,
  leftAt,
  leavePrecision,
}: SessionRow): StoredVoiceSession => {
  const left = Option.all([Option.fromNullOr(leftAt), Option.fromNullOr(leavePrecision)]);
  return {
    userId,
    channelId,
    joined: { at: joinedAt, precision: joinPrecision },
    left: pipe(
      left,
      Option.map(([at, precision]) => ({ at, precision })),
      Option.getOrNull,
    ),
  };
};

const timeFilterOf = ({ since, until }: VoiceLookup): readonly SQL[] => {
  const before = Option.map(Option.fromNullOr(until), (at) => lte(voiceSession.joinedAt, at));
  const after = Option.flatMap(Option.fromNullOr(since), (at) =>
    Option.fromUndefinedOr(or(isNull(voiceSession.leftAt), gte(voiceSession.leftAt, at))),
  );
  return [...Option.toArray(before), ...Option.toArray(after)];
};

const rowsOf = (db: DrizzleSqliteDODatabase, lookup: VoiceLookup): readonly SessionRow[] => {
  const timed = timeFilterOf(lookup);
  const query = (extra: readonly SQL[]): readonly SessionRow[] =>
    db
      .select()
      .from(voiceSession)
      .where(and(...timed, ...extra))
      .all();
  return Option.match(Option.fromNullOr(lookup.userIds), {
    onNone: () => query([]),
    onSome: (ids) =>
      pipe(
        Array.chunksOf(ids, BOUND_LIMIT),
        Array.flatMap((chunk) => query([inArray(voiceSession.userId, [...chunk])])),
      ),
  });
};

const newestFirst = Order.combine(
  Order.flip(Order.mapInput(Order.Number, ({ joinedAt }: SessionRow) => joinedAt)),
  Order.flip(Order.mapInput(Order.Number, ({ id }: SessionRow) => id)),
);

const readOf = (
  db: DrizzleSqliteDODatabase,
  lookup: VoiceLookup,
  erased: readonly string[],
): VoicePage => {
  const visible = new Set(lookup.channelIds);
  const matched = pipe(
    rowsOf(db, lookup),
    Array.filter(({ channelId, userId }) => visible.has(channelId) && !erased.includes(userId)),
  );
  const sorted = Array.sort(matched, newestFirst);
  return {
    total: sorted.length,
    sessions: pipe(sorted.slice(lookup.offset, lookup.offset + lookup.limit), Array.map(sessionOf)),
  };
};

const voiceLedger = (db: DrizzleSqliteDODatabase): VoiceLedger => ({
  change: (changes, erased) => {
    for (const change of changes) {
      if (!erased.includes(change.userId)) {
        changeOf(db, change);
      }
    }
  },
  snapshot: (snapshot, erased) => {
    snapshotOf(db, snapshot, erased);
  },
  read: (lookup, erased) => readOf(db, lookup, erased),
  forget: (userId) => {
    db.delete(voiceSession).where(eq(voiceSession.userId, userId)).run();
  },
});

export { voiceLedger };
export type { VoiceLedger };
export type { VoiceChangeWrite, VoiceLookup, VoicePage, VoiceSnapshotWrite } from "./voice-types";
