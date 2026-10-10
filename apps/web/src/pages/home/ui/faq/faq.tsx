import type { ReactNode } from "react";

import { ChannelSection } from "#/pages/home/ui/common/channel-section";
import { MEMBERS } from "#/pages/home/ui/common/members";
import { memberAuthor } from "#/pages/home/ui/message/author";
import { Post } from "#/pages/home/ui/message/post";

import { Closing } from "./closing";
import { FaqPair } from "./faq-pair";

const LEAD = "よくある質問";
const GUIDE = "なんでも聞いてね！";
const CHANNEL = "よくある質問";
const TIME = "今日 21:05";
const NEW = "新着";

const QUESTIONS = [
  {
    time: "今日 21:06",
    reply: { author: memberAuthor(MEMBERS.yui), text: "ねえ、これってお金かかるの？" },
    answer: "かからないよ！いまは無料で使えるの。",
    reactions: [{ emoji: "🎉", count: 5, by: "others" }],
  },
  {
    time: "今日 21:07",
    reply: { author: memberAuthor(MEMBERS.kenta), text: "で、ミルにはどこから聞けばいいの？" },
    answer: "Claude みたいな、MCP に対応した AI のアプリから呼んでね！",
    reactions: [{ emoji: "👀", count: 2, by: "others" }],
  },
  {
    time: "今日 21:08",
    reply: {
      author: memberAuthor(MEMBERS.miho),
      text: "わたし管理者じゃないんだけど、使えるのかな？",
    },
    answer:
      "使えるよ！サーバーの管理権限がいるのは、最初に招待するときだけなんだ。そのあとはみんな、自分が読めるチャンネルの中だけさがせるよ。",
    reactions: [{ emoji: "🙏", count: 3, by: "me" }],
  },
  {
    time: "今日 21:09",
    reply: { author: memberAuthor(MEMBERS.yui), text: "DM まで読まれちゃったりしない？" },
    answer:
      "読まないよ！ミルが読むのはサーバーのチャンネルとスレッドだけ。DM はのぞかないから安心してね。",
    reactions: [{ emoji: "🙆", count: 3, by: "others" }],
  },
  {
    time: "今日 21:10",
    reply: { author: memberAuthor(MEMBERS.tanaka), text: "運営の人って、俺らの会話読めたりする？" },
    answer: "読めないよ！本文は暗号化してしまってあるから、運営さんにも中身は見えないんだ。",
    reactions: [
      { emoji: "🔒", count: 4, by: "others" },
      { emoji: "👍", count: 2, by: "me" },
    ],
  },
] as const;

const Faq = (): ReactNode => (
  <ChannelSection id="faq" name={CHANNEL}>
    <Post time={TIME} guide={GUIDE} lead={LEAD} />
    <div className="text-dc-new mx-4 mt-4 flex items-center text-xs font-bold">
      <hr className="border-dc-new grow" />
      <span className="bg-dc-new text-dc-bright rounded-sm px-1">{NEW}</span>
    </div>
    {QUESTIONS.map((item) => (
      <FaqPair key={item.reply.text} question={item} />
    ))}
    <Closing />
  </ChannelSection>
);

export { Faq };
