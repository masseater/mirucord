import { checkAppPrefix } from "@repo/shared-util-app-name";

import { APP_NAME } from "./app-name.ts";

const requireAppPrefix = checkAppPrefix(APP_NAME);

export { APP_NAME, PREFIX } from "./app-name.ts";
export { requireAppPrefix };
