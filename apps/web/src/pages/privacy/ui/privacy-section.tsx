import type { ReactNode } from "react";

const PrivacySection = ({
  heading,
  paragraphs,
}: Readonly<{ heading: string; paragraphs: readonly string[] }>): ReactNode => (
  <section className="flex flex-col gap-2">
    <h2 className="text-xl font-bold">{heading}</h2>
    {paragraphs.map((paragraph) => (
      <p key={paragraph} className="leading-loose">
        {paragraph}
      </p>
    ))}
  </section>
);

export { PrivacySection };
