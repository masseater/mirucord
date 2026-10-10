import { String } from "effect";
import type { ReactNode } from "react";

const CategoryHeading = ({ name }: Readonly<{ name: string }>): ReactNode =>
  String.isNonEmpty(name) && (
    <h3 className="text-ink-soft text-xs font-black tracking-wide">{name}</h3>
  );

export { CategoryHeading };
