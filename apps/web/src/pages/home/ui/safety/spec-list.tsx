import type { ReactNode } from "react";

import { Embed } from "#/pages/home/ui/message/embed";

import { SpecField } from "./spec-field";

const SPECS = [
  {
    label: "Discord への操作",
    tags: ["読み取りのみ"],
    accent: false,
    detail: "投稿や削除の機能はありません",
  },
  {
    label: "見える範囲",
    tags: ["ロール", "チャンネル権限"],
    accent: false,
    detail: "質問のたびに計算し直します",
  },
  {
    label: "メッセージ本文",
    tags: ["AES-GCM"],
    accent: true,
    detail: "暗号化して保存します",
  },
  {
    label: "ログイン",
    tags: ["Discord OAuth"],
    accent: false,
    detail: "メールアドレスは集めません",
  },
  {
    label: "Bot を外したとき",
    tags: ["すぐ削除"],
    accent: true,
    detail: "メッセージと索引をすべて消します",
  },
  {
    label: "ソースコード",
    tags: ["公開"],
    accent: false,
    detail: "自分の Cloudflare で同じものを動かせます",
  },
] as const;

const SpecList = (): ReactNode => (
  <Embed accent="border-lavender-deep">
    <dl className="grid gap-4 sm:grid-cols-2">
      {SPECS.map((spec) => (
        <SpecField
          key={spec.label}
          label={spec.label}
          tags={spec.tags}
          accent={spec.accent}
          detail={spec.detail}
        />
      ))}
    </dl>
  </Embed>
);

export { SpecList };
