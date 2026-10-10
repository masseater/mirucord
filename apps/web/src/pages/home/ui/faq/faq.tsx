import type { ReactNode } from "react";

import { SectionHead } from "#/pages/home/ui/common/section-head";

import { FaqItem } from "./faq-item";

const LEAD = "よくある質問";
const LABEL = "Q&A";

const QUESTIONS = [
  { question: "料金はかかりますか", answer: "いまは無料で使えます。" },
  {
    question: "どの AI で使えますか",
    answer: "Claude をはじめ MCP に対応したクライアントで使えます。",
  },
  {
    question: "管理者でなくても使えますか",
    answer:
      "Bot の招待にはサーバーの管理権限が必要です。招待したあとはメンバーそれぞれが自分の読めるチャンネルだけを検索できます。",
  },
  {
    question: "運営は会話を読めますか",
    answer: "読めません。本文は暗号化して保存していて、運営が中身を見る仕組みはありません。",
  },
] as const;

const Faq = (): ReactNode => (
  <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-8 px-5 py-24 md:py-32">
    <SectionHead label={LABEL} tone="bg-sky" lead={LEAD} />
    <div className="grid gap-4">
      {QUESTIONS.map((item) => (
        <FaqItem key={item.question} question={item.question} answer={item.answer} />
      ))}
    </div>
  </section>
);

export { Faq };
