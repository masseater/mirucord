import type { GatewayJob } from "@repo/ingest-util-gateway-contract";
import { Discord } from "dfx";
import { Option, Record } from "effect";
import { expect, it } from "vite-plus/test";

import { mergeJobs, toGatewayJobs } from "./gateway-job";

const REACTED_AT = 1000;
const VOTED_AT = 2000;
const ANSWER = 2;
const NO_EMOJI_ID = Option.getOrNull(Option.none<string>());

const jobsOf = (
  event: Discord.GatewayDispatchEvents,
  data: unknown,
  now: number,
): readonly GatewayJob[] =>
  toGatewayJobs({
    payload: {
      op: Discord.GatewayOpcodes.Dispatch,
      ...Record.fromEntries([
        ["t", event],
        ["d", data],
      ]),
    },
    now,
  });

const TARGET = { guild_id: "700", channel_id: "710", message_id: "711" };

it("carries who reacted with which emoji to whose message", () => {
  expect(
    jobsOf(
      Discord.GatewayDispatchEvents.MessageReactionAdd,
      {
        ...TARGET,
        user_id: "901",
        message_author_id: "902",
        emoji: { id: "555", name: "miku" },
        burst: false,
        burst_colors: [],
      },
      REACTED_AT,
    ),
  ).toStrictEqual([
    {
      kind: "reactions",
      guildId: "700",
      changes: [
        {
          kind: "add",
          channelId: "710",
          messageId: "711",
          at: REACTED_AT,
          userId: "901",
          messageAuthorId: "902",
          emoji: "miku:555",
          burst: false,
        },
      ],
    },
  ]);
});

it("keeps reactions, clears and poll votes of a server in order", () => {
  const removed = jobsOf(
    Discord.GatewayDispatchEvents.MessageReactionRemove,
    { ...TARGET, user_id: "901", emoji: { id: NO_EMOJI_ID, name: "👍" }, burst: true },
    REACTED_AT,
  );
  const cleared = jobsOf(
    Discord.GatewayDispatchEvents.MessageReactionRemoveAll,
    TARGET,
    REACTED_AT,
  );
  const voted = jobsOf(
    Discord.GatewayDispatchEvents.MessagePollVoteAdd,
    { ...TARGET, user_id: "903", answer_id: ANSWER },
    VOTED_AT,
  );
  const place = { channelId: "710", messageId: "711" };
  expect(mergeJobs([...removed, ...cleared, ...voted])).toStrictEqual([
    {
      kind: "reactions",
      guildId: "700",
      changes: [
        { kind: "remove", ...place, at: REACTED_AT, userId: "901", emoji: "👍", burst: true },
        { kind: "clear", ...place, at: REACTED_AT, emoji: NO_EMOJI_ID },
        { kind: "vote", ...place, at: VOTED_AT, userId: "903", answerId: ANSWER },
      ],
    },
  ]);
});
