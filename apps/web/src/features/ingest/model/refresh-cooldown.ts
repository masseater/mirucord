import { Duration } from "effect";

const COOLDOWN_SECONDS = 30;
const REFRESH_COOLDOWN = Duration.seconds(COOLDOWN_SECONDS);

export { REFRESH_COOLDOWN };
