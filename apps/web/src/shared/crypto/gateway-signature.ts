import { DateTime, Result } from "effect";
import { Webhook } from "standardwebhooks";

const MILLIS_PER_SECOND = 1000;

type SignedEvent = Readonly<{ botToken: string; id: string; sentAt: DateTime.Utc; body: string }>;

type GatewayHeaders = Readonly<{
  "webhook-id": string;
  "webhook-timestamp": string;
  "webhook-signature": string;
}>;

const gatewayWebhook = (botToken: string): Webhook => new Webhook(botToken, { format: "raw" });

const signGatewayEvent = ({ botToken, id, sentAt, body }: SignedEvent): GatewayHeaders => ({
  "webhook-id": id,
  "webhook-timestamp": String(Math.floor(DateTime.toEpochMillis(sentAt) / MILLIS_PER_SECOND)),
  "webhook-signature": gatewayWebhook(botToken).sign(id, DateTime.toDate(sentAt), body),
});

const verifyGatewayEvent = ({
  botToken,
  body,
  headers,
}: Readonly<{
  botToken: string;
  body: string;
  headers: Readonly<Record<string, string>>;
}>): boolean => Result.isSuccess(Result.try(() => gatewayWebhook(botToken).verify(body, headers)));

export { signGatewayEvent, verifyGatewayEvent };
export type { GatewayHeaders, SignedEvent };
