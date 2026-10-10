import type { ReactNode } from "react";

import { AnswerBody } from "./answer-body";
import { WindowBar } from "./window-bar";

const LABEL = "AI の画面";

const AnswerWindow = (): ReactNode => (
  <aside
    aria-label={LABEL}
    className="bg-milk text-ink motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:fill-mode-both mx-4 mt-4 max-w-md overflow-hidden rounded-lg motion-safe:delay-500 motion-safe:duration-700 sm:ml-17"
  >
    <WindowBar />
    <AnswerBody />
  </aside>
);

export { AnswerWindow };
