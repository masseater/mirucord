import { MASCOT_NAME } from "./brand";

const SAMPLE_PROMPT = "去年の夏の思い出を教えて";

const ONBOARDING_STEPS = {
  consent: { title: "招待して同意" },
  register: { title: "アプリに URL を登録" },
  ask: { title: `${MASCOT_NAME}に聞く` },
} as const;

export { ONBOARDING_STEPS, SAMPLE_PROMPT };
