import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({ plugins: [oauthProviderClient()] });

export { authClient };
