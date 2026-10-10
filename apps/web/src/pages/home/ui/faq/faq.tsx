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
    reply: { author: memberAuthor(MEMBERS.yui), text: "料金はかかりますか" },
    answer: "いまは無料で使えるよ！",
    reactions: [{ emoji: "🎉", count: 5, by: "others" }],
  },
  {
    time: "今日 21:07",
    reply: { author: memberAuthor(MEMBERS.kenta), text: "どこからミルに聞けますか" },
    answer: "Claude みたいに MCP に対応した AI クライアントから呼んでね！",
    reactions: [{ emoji: "👀", count: 2, by: "others" }],
  },
  {
    time: "今日 21:08",
    reply: { author: memberAuthor(MEMBERS.miho), text: "管理者でなくても使えますか" },
    answer:
      "招待するときだけサーバーの管理権限がいるよ。そのあとはみんなそれぞれ自分の読めるチャンネルだけさがせるの！",
    reactions: [{ emoji: "🙏", count: 3, by: "me" }],
  },
  {
    time: "今日 21:09",
    reply: { author: memberAuthor(MEMBERS.tanaka), text: "運営は会話を読めますか" },
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
