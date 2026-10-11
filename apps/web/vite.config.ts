import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import rsc from "@vitejs/plugin-rsc";
import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  run: {
    tasks: {
      "deploy:ci": {
        command: "alchemy deploy --config alchemy.ci.ts --stage prod --env-file alchemy.ci.env",
        cache: false,
      },
    },
  },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart({ srcDirectory: "src/app", rsc: { enabled: true } }),
    rsc(),
    viteReact(),
  ],
});
