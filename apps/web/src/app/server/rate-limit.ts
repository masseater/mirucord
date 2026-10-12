const RATE_LIMIT_PERIOD = 60;

const MCP_RATE_LIMIT = { limit: 600, period: RATE_LIMIT_PERIOD } as const;
const AUTH_RATE_LIMIT = { limit: 3000, period: RATE_LIMIT_PERIOD } as const;

export { AUTH_RATE_LIMIT, MCP_RATE_LIMIT, RATE_LIMIT_PERIOD };
