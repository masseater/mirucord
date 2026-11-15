import type { UserConfig } from "vite-plus";

type Tasks = NonNullable<NonNullable<UserConfig["run"]>["tasks"]>;

const alchemyTasks = {
  deploy: { command: "alchemy deploy", cache: false },
  destroy: { command: "alchemy destroy", cache: false },
} satisfies Tasks;

export { alchemyTasks };
