import { expect, it } from "vite-plus/test";

import type { InviteCandidate } from "#/entities/guild-message/model/invite.schema";

import { precisionOf, usedSince } from "./invite-diff";
import type { InviteCount } from "./invite-diff";

const INVITER = "901";
const CHANNEL = "820";
const UNLIMITED = 0;
const UNUSED = 0;
const ONCE = 1;
const TWICE = 2;
const THRICE = 3;
const ONE_TIME = 1;
const FIVE_TIMES = 5;
const TEN_TIMES = 10;

const count = (code: string, uses: number, maxUses: number): InviteCount => ({
  code,
  inviterId: INVITER,
  channelId: CHANNEL,
  uses,
  maxUses,
});

const candidate = (code: string): InviteCandidate => ({
  code,
  inviterId: INVITER,
  channelId: CHANNEL,
});

it("picks the invites whose use count went up or that were made and used since", () => {
  const previous = [count("same", THRICE, UNLIMITED), count("grew", ONCE, UNLIMITED)];
  const fetched = [
    count("same", THRICE, UNLIMITED),
    count("grew", TWICE, UNLIMITED),
    count("new", ONCE, FIVE_TIMES),
  ];
  expect(usedSince(fetched)(previous)).toStrictEqual([candidate("grew"), candidate("new")]);
});

it("counts a limited invite that vanished on its last use, but not one deleted early", () => {
  const previous = [count("last", UNUSED, ONE_TIME), count("deleted", ONCE, TEN_TIMES)];
  expect(usedSince([])(previous)).toStrictEqual([candidate("last")]);
});

it("is exact only for one person and one invite", () => {
  const one = [candidate("a")];
  const two = [candidate("a"), candidate("b")];
  expect(precisionOf(["x"])(one)).toBe("exact");
  expect(precisionOf(["x", "y"])(one)).toBe("ambiguous");
  expect(precisionOf(["x"])(two)).toBe("ambiguous");
  expect(precisionOf(["x"])([])).toBe("unknown");
});
