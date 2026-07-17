import { randomBytes, randomUUID } from "node:crypto";
import QRCode from "qrcode";
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

const ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CARD_BRANDS = ["visa", "mastercard", "elo"] as const;
const MERCHANT_NAME = "VESPERA COMMERCE";
const MERCHANT_CITY = "SAO PAULO";
const PIX_EXPIRY_SECONDS = 900;

function randomFrom(alphabet: string, length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function randomAlphanumeric(length: number): string {
  return randomFrom(ALPHANUMERIC, length);
}

function randomDigits(length: number): string {
  return randomFrom("0123456789", length);
}

/**
 * Builds a realistic-looking (but not bank-settled) BR Code / EMV payload for
 * the mock Pix flow — same TLV shape a real PSP would return, minus a
 * cryptographically valid CRC16, since no funds ever move in this demo.
 */
function buildEmvPayload(txid: string, amountCents: number): string {
  const amount = (amountCents / 100).toFixed(2);
  const merchantField = `59${String(MERCHANT_NAME.length).padStart(2, "0")}${MERCHANT_NAME}`;
  const cityField = `60${String(MERCHANT_CITY.length).padStart(2, "0")}${MERCHANT_CITY}`;
  const amountField = `54${String(amount.length).padStart(2, "0")}${amount}`;
  return (
    `00020126580014BR.GOV.BCB.PIX0136${txid}` +
    `5204000053039865${amountField}5802BR${merchantField}${cityField}` +
    `62070503***6304${randomAlphanumeric(4)}`
  );
}

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
    const txid = randomAlphanumeric(25);
    const emvPayload = buildEmvPayload(txid, input.amountCents);
    const qrCodeDataUrl = await QRCode.toDataURL(emvPayload, { margin: 1, width: 320 });
    const expiresAt = new Date(Date.now() + PIX_EXPIRY_SECONDS * 1000).toISOString();

    return {
      provider: "mock",
      paymentRef,
      status: "pending",
      clientAction: {
        type: "pix_qr",
        payload: {
          txid,
          emvPayload,
          copyPaste: emvPayload,
          qrCodeDataUrl,
          merchantName: MERCHANT_NAME,
          city: MERCHANT_CITY,
          amountCents: input.amountCents,
          expiresAt,
          expiresInSeconds: PIX_EXPIRY_SECONDS,
          simulatePaidUrl: `${config.publicApiUrl}/v1/demo/simulate-pix-paid`,
          simulated: true,
        },
      },
    };
  }

  // Card: approve immediately in mock (a real integration would tokenize on
  // the client and confirm via the PSP's 3-D Secure / capture step here).
  const brand = CARD_BRANDS[randomBytes(1)[0] % CARD_BRANDS.length];
  return {
    provider: "mock",
    paymentRef,
    status: "approved",
    clientAction: {
      type: "card_confirm",
      payload: {
        authorizationCode: randomAlphanumeric(6),
        brand,
        last4: randomDigits(4),
        status: "approved",
        receiptId: `rcpt_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
        simulated: true,
      },
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
