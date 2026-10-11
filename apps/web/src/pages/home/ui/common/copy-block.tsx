import type { ReactNode } from "react";

const CopyBlock = ({ text }: Readonly<{ text: string }>): ReactNode => (
  <p className="bg-dc-rail border-dc-line text-dc-text rounded-sm border px-3 py-2.5 font-mono text-sm wrap-anywhere whitespace-pre-line select-all">
    {text}
  </p>
);

export { CopyBlock };
