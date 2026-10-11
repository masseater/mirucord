import { MASCOT_NAME } from "./brand";

const SAMPLE_PROMPT = "去年の夏の思い出を教えて";

const ONBOARDING_STEPS = {
  consent: {
    title: "Bot を招待して同意",
    guide: `同意するまで、${MASCOT_NAME}はサーバーのメッセージを読まないよ。`,
  },
  register: {
    title: `${MASCOT_NAME}を登録`,
    guide: "Claude などの MCP に対応したアプリに、この URL をコネクタとして登録してね。",
  },
  ask: {
    title: "話しかける",
    guide: `登録したアプリで「${SAMPLE_PROMPT}」みたいに話しかけてね。`,
  },
} as const;

export { ONBOARDING_STEPS, SAMPLE_PROMPT };
