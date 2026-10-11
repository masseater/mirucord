import type { ReactNode } from "react";

const SpeechBubble = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <span className="bg-dc-input text-dc-bright inline-block rounded-2xl rounded-bl-none px-4 py-2 text-sm leading-relaxed font-bold">
    {children}
  </span>
);

export { SpeechBubble };
