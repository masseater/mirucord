import { MASCOT_NAME } from "./brand";

const ONBOARDING_STEPS = {
  consent: "Bot を招待して同意",
  register: `${MASCOT_NAME}を登録`,
  ask: "話しかける",
} as const;

const SAMPLE_PROMPT = "去年の夏の思い出を教えて";

export { ONBOARDING_STEPS, SAMPLE_PROMPT };
