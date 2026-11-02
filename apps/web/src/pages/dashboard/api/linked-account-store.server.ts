import { asc, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { Array, DateTime, Effect, Option, pipe } from "effect";

import { connectionsTokenOf, forgetConnectionsToken } from "#/shared/auth/index.server";
import type { TokenOwner } from "#/shared/auth/index.server";
import { db, linkedAccount } from "#/shared/db/index.server";
import { listPublicConnections, revokeUserToken } from "#/shared/discord/index.server";
import type { PublicConnection } from "#/shared/discord/index.server";

type LinkedChoice = PublicConnection & Readonly<{ published: boolean }>;

type LinkedAccounts =
  | Readonly<{ status: "idle"; published: readonly PublicConnection[] }>
  | Readonly<{
      status: "choosing";
      published: readonly PublicConnection[];
      choices: readonly LinkedChoice[];
    }>;

type ConnectionKey = Readonly<{ type: string; name: string }>;

type PublishInput = Readonly<{ owner: TokenOwner; selected: readonly ConnectionKey[] }>;

type PublishResult =
  | Readonly<{ status: "published"; count: number }>
  | Readonly<{ status: "expired" }>;

const sameKey =
  (left: ConnectionKey) =>
  (right: ConnectionKey): boolean =>
    left.type === right.type && left.name === right.name;

const isAmong =
  (keys: readonly ConnectionKey[]) =>
  (key: ConnectionKey): boolean =>
    pipe(keys, Array.some(sameKey(key)));

const readPublished = (userId: string): Effect.Effect<readonly PublicConnection[]> =>
  Effect.promise(() =>
    db
      .select({
        type: linkedAccount.type,
        name: linkedAccount.name,
        verified: linkedAccount.verified,
      })
      .from(linkedAccount)
      .where(eq(linkedAccount.userId, userId))
      .orderBy(asc(linkedAccount.type), asc(linkedAccount.name)),
  );

const discardToken =
  (owner: TokenOwner) =>
  (accessToken: string): Effect.Effect<void> =>
    revokeUserToken(accessToken).pipe(
      Effect.catchTag("DiscordRequestError", () =>
        Effect.logWarning("Could not revoke connections token"),
      ),
      Effect.andThen(forgetConnectionsToken(owner)),
    );

const choicesOf =
  (published: readonly PublicConnection[]) =>
  (available: readonly PublicConnection[]): readonly LinkedChoice[] =>
    pipe(
      available,
      Array.map((connection) => ({
        ...connection,
        published: isAmong(published)(connection),
      })),
    );

const choosingOf =
  (owner: TokenOwner) =>
  (published: readonly PublicConnection[]) =>
  (accessToken: string): Effect.Effect<LinkedAccounts> =>
    listPublicConnections(accessToken).pipe(
      Effect.map((available): LinkedAccounts => ({
        status: "choosing",
        published,
        choices: choicesOf(published)(available),
      })),
      Effect.catchTag("DiscordRequestError", () =>
        Effect.logWarning("Could not list connections").pipe(
          Effect.andThen(forgetConnectionsToken(owner)),
          Effect.as<LinkedAccounts>({ status: "idle", published }),
        ),
      ),
    );

const loadLinkedAccounts = (owner: TokenOwner): Effect.Effect<LinkedAccounts> =>
  Effect.all([readPublished(owner.userId), connectionsTokenOf(owner)]).pipe(
    Effect.flatMap(([published, token]) =>
      Option.match(token, {
        onNone: () => Effect.succeed<LinkedAccounts>({ status: "idle", published }),
        onSome: choosingOf(owner)(published),
      }),
    ),
    Effect.withSpan("loadLinkedAccounts"),
  );

const insertOf =
  ({ userId, discordUserId }: TokenOwner) =>
  (now: DateTime.Utc) =>
  (connection: PublicConnection): BatchItem<"sqlite"> =>
    db
      .insert(linkedAccount)
      .values({ ...connection, userId, discordUserId, publishedAt: DateTime.toEpochMillis(now) });

const writeRows =
  (owner: TokenOwner) =>
  (connections: readonly PublicConnection[]) =>
  (now: DateTime.Utc): Effect.Effect<void> => {
    const inserts = pipe(connections, Array.map(insertOf(owner)(now)));
    return Effect.promise(() =>
      db.batch([
        db.delete(linkedAccount).where(eq(linkedAccount.userId, owner.userId)),
        ...inserts,
      ]),
    ).pipe(Effect.asVoid);
  };

const replaceRows =
  (owner: TokenOwner) =>
  (connections: readonly PublicConnection[]): Effect.Effect<void> =>
    DateTime.now.pipe(Effect.flatMap(writeRows(owner)(connections)));

const keepSelected =
  (selected: readonly ConnectionKey[]) =>
  (connections: readonly PublicConnection[]): readonly PublicConnection[] =>
    pipe(connections, Array.filter(isAmong(selected)));

const logPublished = (count: number): Effect.Effect<void> =>
  Effect.logInfo("Linked accounts published").pipe(Effect.annotateLogs({ count }));

const publishWith =
  ({ owner, selected }: PublishInput) =>
  (accessToken: string): Effect.Effect<PublishResult> =>
    listPublicConnections(accessToken).pipe(
      Effect.map(keepSelected(selected)),
      Effect.tap(replaceRows(owner)),
      Effect.tap(() => discardToken(owner)(accessToken)),
      Effect.tap((rows) => logPublished(rows.length)),
      Effect.map((rows): PublishResult => ({ status: "published", count: rows.length })),
      Effect.catchTag("DiscordRequestError", () =>
        Effect.succeed<PublishResult>({ status: "expired" }),
      ),
    );

const publishOrExpire = (
  input: PublishInput,
): ((token: Option.Option<string>) => Effect.Effect<PublishResult>) =>
  Option.match({
    onNone: () => Effect.succeed<PublishResult>({ status: "expired" }),
    onSome: publishWith(input),
  });

const publishLinkedAccounts = (input: PublishInput): Effect.Effect<PublishResult> =>
  connectionsTokenOf(input.owner).pipe(
    Effect.flatMap(publishOrExpire(input)),
    Effect.withSpan("publishLinkedAccounts"),
  );

const discardOrForget = (
  owner: TokenOwner,
): ((token: Option.Option<string>) => Effect.Effect<void>) =>
  Option.match({ onNone: () => forgetConnectionsToken(owner), onSome: discardToken(owner) });

const discardLinkedAccountsDraft = (owner: TokenOwner): Effect.Effect<void> =>
  connectionsTokenOf(owner).pipe(
    Effect.flatMap(discardOrForget(owner)),
    Effect.withSpan("discardLinkedAccountsDraft"),
  );

const withdrawLinkedAccounts = (owner: TokenOwner): Effect.Effect<void> =>
  replaceRows(owner)([]).pipe(
    Effect.andThen(discardLinkedAccountsDraft(owner)),
    Effect.andThen(Effect.logInfo("Linked accounts withdrawn")),
    Effect.withSpan("withdrawLinkedAccounts"),
  );

export {
  discardLinkedAccountsDraft,
  loadLinkedAccounts,
  publishLinkedAccounts,
  withdrawLinkedAccounts,
};
export type { ConnectionKey, LinkedAccounts, LinkedChoice, PublishResult };
