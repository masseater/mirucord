import type { ReactNode } from "react";

const SpeechBubble = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <span className="border-ink bg-milk inline-block rounded-2xl rounded-bl-none border-2 px-4 py-2 text-sm leading-relaxed font-bold">
    {children}
  </span>
);

export { SpeechBubble };
