import type { ReactNode } from "react";

import { SectionHead } from "#/pages/home/ui/common/section-head";

import { FaqItem } from "./faq-item";

const LEAD = "よくある質問";
const LABEL = "六 質問";

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
    answer:
      "本文は暗号化して保存しています。サポートで中身を見るのはサーバー管理者が期限つきで許可したときだけにする予定です。",
  },
] as const;

const Faq = (): ReactNode => (
  <section id="faq" className="mx-auto w-full max-w-6xl scroll-mt-8 px-5 py-24 md:py-32">
    <SectionHead label={LABEL} lead={LEAD} />
    <div className="grid max-w-4xl gap-3">
      {QUESTIONS.map((item) => (
        <FaqItem key={item.question} question={item.question} answer={item.answer} />
      ))}
    </div>
  </section>
);

export { Faq };
