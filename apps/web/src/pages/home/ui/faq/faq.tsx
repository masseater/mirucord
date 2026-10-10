import type { ReactNode } from "react";

import { Closing } from "#/pages/home/ui/closing/closing";
import { ChannelSection } from "#/pages/home/ui/common/channel-section";
import { MEMBERS } from "#/pages/home/ui/common/members";
import { Post } from "#/pages/home/ui/message/post";

import { FaqPair } from "./faq-pair";

const LEAD = "よくある質問";
const GUIDE = "なんでも聞いてね";
const CHANNEL = "よくある質問";
const TIME = "今日 21:05";

const QUESTIONS = [
  {
    member: MEMBERS.yui,
    time: "今日 21:06",
    question: "料金はかかりますか",
    answer: "いまは無料で使えます。",
  },
  {
    member: MEMBERS.kenta,
    time: "今日 21:07",
    question: "どの AI で使えますか",
    answer: "Claude をはじめ MCP に対応したクライアントで使えます。",
  },
  {
    member: MEMBERS.miho,
    time: "今日 21:08",
    question: "管理者でなくても使えますか",
    answer:
      "Bot の招待にはサーバーの管理権限が必要です。招待したあとはメンバーそれぞれが自分の読めるチャンネルだけを検索できます。",
  },
  {
    member: MEMBERS.tanaka,
    time: "今日 21:09",
    question: "運営は会話を読めますか",
    answer: "読めません。本文は暗号化して保存していて、運営が中身を見る仕組みはありません。",
  },
] as const;

const Faq = (): ReactNode => (
  <ChannelSection id="faq" name={CHANNEL}>
    <Post time={TIME} guide={GUIDE} lead={LEAD} />
    {QUESTIONS.map((item) => (
      <FaqPair
        key={item.question}
        member={item.member}
        time={item.time}
        question={item.question}
        answer={item.answer}
      />
    ))}
    <Closing />
  </ChannelSection>
);

export { Faq };
