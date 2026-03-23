import type {
  PaymentProvider,
  CreateSessionRequest,
  CreateSessionResult,
  WebhookEvent,
} from "../types";

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY!;
const XENDIT_WEBHOOK_TOKEN = process.env.XENDIT_WEBHOOK_TOKEN!;
const XENDIT_API = "https://api.xendit.co";

function authHeader(): string {
  return "Basic " + Buffer.from(XENDIT_SECRET_KEY + ":").toString("base64");
}

export class XenditProvider implements PaymentProvider {
  readonly name = "xendit";

  async createSession(req: CreateSessionRequest): Promise<CreateSessionResult> {
    const res = await fetch(`${XENDIT_API}/v2/invoices`, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_id: req.orderId,
        amount: req.amountCents / 100,
        currency: req.currency,
        description: req.description,
        payer_email: req.customerEmail,
        customer: {
          given_names: req.customerName,
          email: req.customerEmail,
        },
        success_redirect_url: req.successUrl,
        failure_redirect_url: req.failureUrl,
        // 24-hour expiry
        invoice_duration: 86400,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Xendit create invoice failed (${res.status}): ${body}`);
    }

    const data = await res.json();

    return {
      providerSessionId: data.id,
      checkoutUrl: data.invoice_url,
      expiresAt: data.expiry_date,
    };
  }

  async parseWebhook(headers: Headers, body: unknown, _rawBody?: string): Promise<WebhookEvent> {
    const token = headers.get("x-callback-token");
    if (token !== XENDIT_WEBHOOK_TOKEN) {
      throw new Error("Invalid webhook token");
    }

    const event = body as Record<string, unknown>;
    return this.mapEvent(event);
  }

  async getSessionStatus(providerSessionId: string): Promise<WebhookEvent> {
    const res = await fetch(`${XENDIT_API}/v2/invoices/${providerSessionId}`, {
      headers: { Authorization: authHeader() },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Xendit get invoice failed (${res.status}): ${body}`);
    }

    const data = await res.json();
    return this.mapEvent(data);
  }

  private mapEvent(data: Record<string, unknown>): WebhookEvent {
    const fees = data.fees as Array<{ type: string; value: number }> | undefined;
    const totalFee = fees?.reduce((sum, f) => sum + (f.value ?? 0), 0) ?? 0;
    const amount = (data.amount as number) ?? (data.paid_amount as number) ?? 0;

    return {
      orderId: data.external_id as string,
      providerSessionId: data.id as string,
      status: this.mapStatus(data.status as string),
      paymentChannel: (data.payment_channel as string) ?? undefined,
      paymentChannelType: (data.payment_method as string) ?? undefined,
      paidAt: (data.paid_at as string) ?? undefined,
      referenceId: (data.payment_id as string) ?? (data.id as string),
      transactionId: (data.id as string),
      feeCents: totalFee ? Math.round(totalFee * 100) : undefined,
      netAmountCents: totalFee ? Math.round((amount - totalFee) * 100) : undefined,
      settlementStatus: (data.settlement_status as string) ?? undefined,
      estimatedSettlementAt: (data.estimated_settlement_date as string) ?? undefined,
      settledAt: (data.date_settled as string) ?? undefined,
      raw: data,
    };
  }

  private mapStatus(xenditStatus: string): WebhookEvent["status"] {
    switch (xenditStatus) {
      case "PAID":
      case "SETTLED":
        return "paid";
      case "EXPIRED":
        return "expired";
      default:
        return "failed";
    }
  }
}
