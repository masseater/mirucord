import type { ReactNode } from "react";

const LINKS = [
  { href: "#why", label: "思い出" },
  { href: "#how", label: "しくみ" },
  { href: "#start", label: "はじめかた" },
  { href: "#safety", label: "あんしん" },
  { href: "#faq", label: "Q&A" },
] as const;

const NavLinks = (): ReactNode => (
  <ul className="text-ink-soft hidden gap-7 text-sm font-bold md:flex">
    {LINKS.map((link) => (
      <li key={link.href}>
        <a href={link.href} className="hover:text-blurple no-underline">
          {link.label}
        </a>
      </li>
    ))}
  </ul>
);

export { NavLinks };
