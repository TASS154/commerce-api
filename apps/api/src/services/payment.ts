import { randomUUID } from "node:crypto";
import { config, paymentIsConfigured } from "../config.js";
import { signWebhookPayload } from "../plugins/auth.js";

export type ChargeInput = {
  orderId: string;
  amountCents: number;
  method: "pix" | "card";
  customerEmail: string;
};

export type ChargeResult = {
  provider: "mock" | "live";
  paymentRef: string;
  status: "pending" | "approved" | "rejected";
  clientAction?: {
    type: "pix_qr" | "card_confirm";
    payload: Record<string, unknown>;
  };
};

/**
 * Payment adapter.
 * - mock (default): fully functional demo; no external network.
 * - live: activated when PAYMENT_SECRET_KEY + PAYMENT_WEBHOOK_SECRET are set.
 *   The live path is intentionally a clear stub — drop in your PSP SDK there.
 */
export async function createCharge(input: ChargeInput): Promise<ChargeResult> {
  if (paymentIsConfigured() && config.payment.provider === "live") {
    // Live adapter stub — replace with real PSP calls. Secrets never logged.
    return {
      provider: "live",
      paymentRef: `live_${randomUUID()}`,
      status: "pending",
      clientAction: {
        type: input.method === "pix" ? "pix_qr" : "card_confirm",
        payload: {
          message:
            "Live provider configured. Implement PSP charge here using PAYMENT_SECRET_KEY.",
        },
      },
    };
  }

  const paymentRef = `mock_${randomUUID().replace(/-/g, "").slice(0, 24)}`;

  if (input.method === "pix") {
    return {
      provider: "mock",
      paymentRef,
      status: "pending",
      clientAction: {
        type: "pix_qr",
        payload: {
          qrCode: `00020126580014BR.GOV.BCB.PIX0136${paymentRef}520400005303986540${(input.amountCents / 100).toFixed(2)}5802BR5925VESPERA COMMERCE6009SAO PAULO62070503***6304ABCD`,
          copyPaste: `vespera-pix-${paymentRef}`,
          expiresInSeconds: 900,
          simulatePaidUrl: `${config.publicApiUrl}/v1/demo/simulate-pix-paid`,
        },
      },
    };
  }

  // Card: approve immediately in mock (token would come from client SDK)
  return {
    provider: "mock",
    paymentRef,
    status: "approved",
    clientAction: {
      type: "card_confirm",
      payload: { last4: "4242", brand: "visa" },
    },
  };
}

export function buildMockWebhook(orderId: string, paymentRef: string, status: "paid" | "rejected") {
  const body = JSON.stringify({
    id: `evt_${randomUUID()}`,
    type: "payment.updated",
    data: { orderId, paymentRef, status },
  });
  const secret = config.payment.webhookSecret || "vespera-demo-webhook-secret";
  return {
    body,
    signature: signWebhookPayload(body, secret),
  };
}
