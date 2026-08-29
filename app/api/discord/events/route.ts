import { verifyKey } from "discord-interactions";
import { after } from "next/server";
import { handleAppAuthorized, type AppAuthorizedData } from "@/lib/services/discord-install";

/**
 * Discord **webhook events** for the application (Developer Portal → Webhooks →
 * Endpoint URL = `{AUTH_URL}/api/discord/events`). Signed exactly like the
 * interactions endpoint, with the same public key.
 *
 * Discord expects an answer within 3 seconds and retries otherwise, so the
 * work happens in `after()` and the response is an immediate 204. A repeated
 * delivery is harmless: the welcome DM is guarded by a `BotEvent` key.
 */

/** `type` of the envelope: 0 = PING (endpoint validation), 1 = an event. */
const PING = 0;
const EVENT = 1;

type WebhookEvent = {
  version?: number;
  application_id?: string;
  type: number;
  event?: { type?: string; timestamp?: string; data?: unknown };
};

const ok = () => new Response(null, { status: 204 });

export async function POST(request: Request) {
  const signature = request.headers.get("x-signature-ed25519") ?? "";
  const timestamp = request.headers.get("x-signature-timestamp") ?? "";
  const rawBody = await request.text();
  const publicKey = process.env.DISCORD_PUBLIC_KEY ?? "";
  if (!publicKey || !(await verifyKey(rawBody, signature, timestamp, publicKey))) {
    return new Response("invalid signature", { status: 401 });
  }

  let payload: WebhookEvent;
  try {
    payload = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return new Response("bad request", { status: 400 });
  }

  if (payload.type === PING) return ok();
  if (payload.type === EVENT && payload.event?.type === "APPLICATION_AUTHORIZED") {
    const data = payload.event.data as AppAuthorizedData;
    after(() => handleAppAuthorized(data));
  }
  // Anything else (entitlements, unknown future events) is acknowledged and ignored.
  return ok();
}
