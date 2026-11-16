import { APP_NAME } from "@repo/shared-util-app-name/app-name";

import { checkAppPrefix } from "./model/check-app-prefix.ts";

export const requireAppPrefix = checkAppPrefix(APP_NAME);

export { APP_NAME, ENV_PREFIX, PREFIX } from "@repo/shared-util-app-name/app-name";
