import type {
  PaymentProvider,
  CreateSessionRequest,
  CreateSessionResult,
  WebhookEvent,
} from "../types";
import { createHmac } from "crypto";

const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY!;
const PAYMONGO_WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET!;
const PAYMONGO_API = "https://api.paymongo.com/v1";

function authHeader(): string {
  return "Basic " + Buffer.from(PAYMONGO_SECRET_KEY + ":").toString("base64");
}

export class PayMongoProvider implements PaymentProvider {
  readonly name = "paymongo";

  async createSession(req: CreateSessionRequest): Promise<CreateSessionResult> {
    const res = await fetch(`${PAYMONGO_API}/checkout_sessions`, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            description: req.description,
            line_items: [
              {
                currency: req.currency,
                amount: req.amountCents,
                name: req.description,
                quantity: 1,
              },
            ],
            payment_method_types: [
              "gcash",
              "grab_pay",
              "paymaya",
              "card",
              "dob",
              "billease",
            ],
            success_url: req.successUrl,
            cancel_url: req.failureUrl,
            reference_number: req.orderId,
            customer_email: req.customerEmail,
          },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`PayMongo create checkout failed (${res.status}): ${body}`);
    }

    const json = await res.json();
    const session = json.data;

    return {
      providerSessionId: session.id,
      checkoutUrl: session.attributes.checkout_url,
      expiresAt: session.attributes.expired_at ?? "",
    };
  }

  async parseWebhook(headers: Headers, body: unknown, rawBody?: string): Promise<WebhookEvent> {
    const signature = headers.get("paymongo-signature");
    if (!signature) throw new Error("Missing PayMongo signature");

    // PayMongo signature format: t=<timestamp>,te=<test_sig>,li=<live_sig>
    const parts = Object.fromEntries(
      signature.split(",").map((p) => {
        const [key, ...rest] = p.split("=");
        return [key, rest.join("=")];
      }),
    );

    const timestamp = parts.t;
    if (!timestamp) throw new Error("Invalid webhook signature format");

    const bodyStr = rawBody ?? JSON.stringify(body);
    const payload = `${timestamp}.${bodyStr}`;
    const computed = createHmac("sha256", PAYMONGO_WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");

    // Check against live signature (li) first, fall back to test (te)
    const expected = parts.li || parts.te;
    if (computed !== expected) {
      throw new Error("Invalid webhook token");
    }

    const event = body as Record<string, unknown>;
    const data = (event.data as Record<string, unknown>) ?? {};
    const attributes = (data.attributes as Record<string, unknown>) ?? {};
    const eventData = (attributes.data as Record<string, unknown>) ?? {};
    const eventAttributes = (eventData.attributes as Record<string, unknown>) ?? {};

    return this.mapCheckoutSession(eventAttributes, eventData.id as string);
  }

  async getSessionStatus(providerSessionId: string): Promise<WebhookEvent> {
    const res = await fetch(
      `${PAYMONGO_API}/checkout_sessions/${providerSessionId}`,
      {
        headers: {
          Authorization: authHeader(),
          Accept: "application/json",
        },
      },
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`PayMongo get session failed (${res.status}): ${body}`);
    }

    const json = await res.json();
    const session = json.data;

    return this.mapCheckoutSession(session.attributes, session.id);
  }

  private mapCheckoutSession(
    attributes: Record<string, unknown>,
    sessionId: string,
  ): WebhookEvent {
    const payments = attributes.payments as Array<Record<string, unknown>> | undefined;
    const lastPayment = payments?.[payments.length - 1];
    const paymentAttrs = (lastPayment?.attributes as Record<string, unknown>) ?? {};

    const amountCents = (paymentAttrs.amount as number) ?? 0;
    const feeCents = (paymentAttrs.fee as number) ?? 0;
    const netCents = (paymentAttrs.net_amount as number) ?? amountCents - feeCents;

    return {
      orderId: (attributes.reference_number as string) ?? "",
      providerSessionId: sessionId,
      status: this.mapStatus(attributes.payment_intent?.toString(), attributes.status as string),
      paymentChannel: (paymentAttrs.source as Record<string, unknown>)?.type as string ?? undefined,
      paymentChannelType: (paymentAttrs.source as Record<string, unknown>)?.type as string ?? undefined,
      paidAt: (paymentAttrs.paid_at as string) ??
        (typeof paymentAttrs.paid_at === "number"
          ? new Date(paymentAttrs.paid_at * 1000).toISOString()
          : undefined),
      referenceId: lastPayment?.id as string ?? undefined,
      transactionId: sessionId,
      feeCents: feeCents || undefined,
      netAmountCents: netCents || undefined,
      raw: { session_id: sessionId, attributes },
    };
  }

  private mapStatus(
    _paymentIntent: string | undefined,
    checkoutStatus: string,
  ): WebhookEvent["status"] {
    switch (checkoutStatus) {
      case "paid":
      case "completed":
        return "paid";
      case "expired":
        return "expired";
      default:
        return "failed";
    }
  }
}
