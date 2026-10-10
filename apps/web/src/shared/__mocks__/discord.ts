import { Option, Record } from "effect";

const NOT_FOUND = 404;
const UNKNOWN_MEMBER = 10_007;
const MEMBER_PATH = /\/guilds\/(?<guildId>\d+)\/members\/(?<userId>\d+)$/u;
const MESSAGES_PATH = /\/channels\/\d+\/messages$/u;

type Memberships = Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>;
type DiscordCall = Readonly<{ url: string; memberships: Memberships }>;

const memberPathOf = (pathname: string): Option.Option<Readonly<Record<string, string>>> =>
  Option.fromNullOr(MEMBER_PATH.exec(pathname)).pipe(
    Option.flatMap(({ groups }) => Option.fromUndefinedOr(groups)),
  );

const rolesOf = (
  memberships: Memberships,
  path: Readonly<Record<string, string>>,
): Option.Option<readonly string[]> =>
  Option.all([Record.get(path, "guildId"), Record.get(path, "userId")]).pipe(
    Option.flatMap(([guildId, userId]) =>
      Record.get(memberships, guildId).pipe(Option.flatMap(Record.get(userId))),
    ),
  );

const notFound = (message: string): Response =>
  Response.json({ message, code: UNKNOWN_MEMBER }, { status: NOT_FOUND });

const answerAsDiscord = ({ url, memberships }: DiscordCall): Response => {
  const { pathname } = new URL(url);
  return Option.match(memberPathOf(pathname), {
    onSome: (path) =>
      Option.match(rolesOf(memberships, path), {
        onNone: () => notFound("Unknown Member"),
        onSome: (roles) => Response.json({ roles }),
      }),
    onNone: () => {
      if (MESSAGES_PATH.test(pathname)) {
        return Response.json([]);
      }
      return notFound("Unknown route");
    },
  });
};

const fetchedPaths = (calls: readonly (readonly unknown[])[]): readonly string[] =>
  calls.map(([input]) => new URL(String(input)).pathname);

export { answerAsDiscord, fetchedPaths };
export type { DiscordCall, Memberships };
