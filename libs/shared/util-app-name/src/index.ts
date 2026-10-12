import { APP_NAME } from "./app-name";
import { checkAppPrefix } from "./check-app-prefix";

const requireAppPrefix = checkAppPrefix(APP_NAME);

export { APP_NAME, ENV_PREFIX, PREFIX } from "./app-name";
export { requireAppPrefix };
