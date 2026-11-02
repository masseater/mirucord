import type { Effect } from "effect";

import { seal, unseal } from "./message-envelope.server";

type AuditAddress = Readonly<{ guildId: string; entryId: string }>;

type AuditSealing = Readonly<{ key: CryptoKey; address: AuditAddress }>;

const contextOf = ({ guildId, entryId }: AuditAddress): string => `${guildId}/audit/${entryId}`;

const sealAudit = ({ key, address }: AuditSealing): ((detail: string) => Effect.Effect<string>) =>
  seal(key, contextOf(address));

const openAudit = ({ key, address }: AuditSealing): ((sealed: string) => Effect.Effect<string>) =>
  unseal(key, contextOf(address));

export { openAudit, sealAudit };
export type { AuditAddress, AuditSealing };
