import fsd from "@r_masseater/vp-tools/fsd";
import { defineConfig } from "steiger";

export default defineConfig([
  ...fsd.configs.recommended,
  {
    rules: {
      "fsd/no-cross-imports": "error",
      "fsd/no-higher-level-imports": "error",
      "fsd/no-wildcard-exports": "error",
    },
  },
]);
