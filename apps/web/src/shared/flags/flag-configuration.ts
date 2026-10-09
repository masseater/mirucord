const flagConfiguration = {
  "ingest-enabled": {
    variants: { on: true, off: false },
    defaultVariant: "on",
    disabled: false,
  },
} as const;

export { flagConfiguration };
