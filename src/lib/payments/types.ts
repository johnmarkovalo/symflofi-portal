/** Provider-agnostic payment types. Our code never talks directly to Xendit/PayMongo/etc. */

export type PaymentMethod = "ewallet" | "bank_transfer" | "card";

export type CreateSessionRequest = {
  orderId: string;
  amountCents: number;
  currency: "PHP";
  description: string;
  customerEmail: string;
  customerName: string;
  paymentMethod?: PaymentMethod;
  successUrl: string;
  failureUrl: string;
};

export type CreateSessionResult = {
  providerSessionId: string;
  checkoutUrl: string;
  expiresAt: string;
};

export type WebhookEvent = {
  orderId: string;
  providerSessionId: string;
  status: "paid" | "failed" | "expired";
  paymentChannel?: string;
  paymentChannelType?: string;
  paidAt?: string;
  referenceId?: string;
  transactionId?: string;
  feeCents?: number;
  netAmountCents?: number;
  settlementStatus?: string;
  estimatedSettlementAt?: string;
  settledAt?: string;
  raw?: Record<string, unknown>;
};

export interface PaymentProvider {
  readonly name: string;
  createSession(req: CreateSessionRequest): Promise<CreateSessionResult>;
  parseWebhook(headers: Headers, body: unknown, rawBody?: string): Promise<WebhookEvent>;
  getSessionStatus(providerSessionId: string): Promise<WebhookEvent>;
}
