import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WebhookEvent } from "../types";

// --- Mocks ---

// Queue of results: each from() call pops the next result
const queryResults: Array<{ data: unknown; error: unknown; count?: number | null }> = [];

function queueResult(data: unknown, error: unknown = null, count?: number | null) {
  queryResults.push({ data, error, count: count ?? null });
}

function createChain() {
  const result = () => queryResults.shift() ?? { data: null, error: null, count: null };

  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    not: vi.fn(() => chain),
    gt: vi.fn(() => chain),
    update: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result())),
    // Make chain awaitable (for queries without .single())
    then(resolve: (v: unknown) => void, reject?: (e: unknown) => void) {
      return Promise.resolve(result()).then(resolve, reject);
    },
  };
  return chain;
}

const mockSupabase = {
  from: vi.fn(() => createChain()),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

const mockProvider = {
  name: "test-provider",
  createSession: vi.fn(),
  parseWebhook: vi.fn(),
  getSessionStatus: vi.fn(),
};

vi.mock("../providers", () => ({
  getProvider: vi.fn(() => mockProvider),
}));

const { createPaymentSession, handlePaymentWebhook, pollPaymentStatus } =
  await import("../service");

describe("createPaymentSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryResults.length = 0;
  });

  it("throws when order is not found", async () => {
    queueResult(null, { message: "not found" });

    await expect(
      createPaymentSession("order-1", "user@test.com", "Test User"),
    ).rejects.toThrow("Order not found");
  });

  it("throws when order is not pending", async () => {
    queueResult({ id: "order-1", total_price_cents: 10000, status: "paid", operator_id: "op-1" });

    await expect(
      createPaymentSession("order-1", "user@test.com", "Test User"),
    ).rejects.toThrow("Order is not pending");
  });

  it("creates session and returns checkout URL", async () => {
    // 1. Order lookup (.single())
    queueResult({ id: "order-1", total_price_cents: 50000, status: "pending", operator_id: "op-1" });
    // 2. Items lookup (awaited — destructured as { data: items })
    queueResult([{ tier_name: "pro", tier_label: "Pro", quantity: 2, bonus_quantity: 0, discount_pct: 0 }]);
    // 3. Operator lookup (.single())
    queueResult({ is_distributor: false, distributor_discount_pct: 0 });
    // 4. License tiers lookup with .in() (awaited — destructured as { data: tiers })
    queueResult([{ name: "pro", price_cents: 25000 }]);
    // 5. Update order total (awaited — total matches so this may not fire, but queue for safety)
    queueResult(null);
    // 6. Update order with provider info (awaited)
    queueResult(null);

    mockProvider.createSession.mockResolvedValue({
      providerSessionId: "sess-123",
      checkoutUrl: "https://pay.test/checkout",
      expiresAt: "2026-03-12T00:00:00Z",
    });

    const result = await createPaymentSession("order-1", "user@test.com", "Test User");

    expect(result).toEqual({ checkoutUrl: "https://pay.test/checkout" });
    expect(mockProvider.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-1",
        currency: "PHP",
      }),
    );
  });
});

describe("handlePaymentWebhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryResults.length = 0;
  });

  it("parses webhook and processes paid event", async () => {
    const event: WebhookEvent = {
      orderId: "order-1",
      providerSessionId: "sess-123",
      status: "paid",
      paidAt: "2026-03-11T12:00:00Z",
    };

    mockProvider.parseWebhook.mockResolvedValue(event);

    // processPaymentEvent flow:
    // 1. Find order by session ID (.single())
    queueResult({ id: "order-1", status: "pending", operator_id: "op-1", keys_generated: false });
    // 2. Load items (awaited — destructured as { data: items })
    queueResult([{ tier_name: "pro", quantity: 1 }]);
    // 3. Count existing keys for order (awaited — { count })
    queueResult(null, null, 0);
    // 4. Count existing keys per tier (awaited — { count })
    queueResult(null, null, 0);
    // 5. Tier lookup for duration + product (.single())
    queueResult({ duration_days: 365, product: "symflofi" });
    // 6. Verify final count (awaited — { count })
    queueResult(null, null, 1);
    // 7. Update keys_generated = true (awaited)
    queueResult(null);
    // 8. Update order status to paid (awaited)
    queueResult(null);

    const headers = new Headers();
    await handlePaymentWebhook(headers, { test: true });

    expect(mockProvider.parseWebhook).toHaveBeenCalledWith(headers, { test: true });
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "generate_license_keys_bulk",
      expect.objectContaining({
        p_operator_id: "op-1",
        p_tier: "pro",
        p_quantity: 1,
        p_product: "symflofi",
      }),
    );
  });

  it("is idempotent for already-paid orders with keys generated", async () => {
    const event: WebhookEvent = {
      orderId: "order-1",
      providerSessionId: "sess-123",
      status: "paid",
    };

    mockProvider.parseWebhook.mockResolvedValue(event);

    // Order already paid AND keys already generated — fully idempotent
    queueResult({ id: "order-1", status: "paid", operator_id: "op-1", keys_generated: true });

    const headers = new Headers();
    await handlePaymentWebhook(headers, {});

    // Should not generate keys
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });
});

describe("pollPaymentStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryResults.length = 0;
  });

  it("returns cached status for resolved orders", async () => {
    queueResult({ id: "order-1", status: "paid", provider_session_id: "sess-123" });

    const result = await pollPaymentStatus("order-1");
    expect(result).toEqual({ status: "paid" });
    expect(mockProvider.getSessionStatus).not.toHaveBeenCalled();
  });

  it("queries provider for pending orders", async () => {
    // 1. pollPaymentStatus: order lookup (.single())
    queueResult({ id: "order-1", status: "pending", provider_session_id: "sess-123" });

    mockProvider.getSessionStatus.mockResolvedValue({
      orderId: "order-1",
      providerSessionId: "sess-123",
      status: "paid",
      paidAt: "2026-03-11T12:00:00Z",
    });

    // processPaymentEvent flow:
    // 2. Find order by session ID (.single())
    queueResult({ id: "order-1", status: "pending", operator_id: "op-1", keys_generated: false });
    // 3. Load items (awaited — destructured as { data: items })
    queueResult([{ tier_name: "pro", quantity: 1 }]);
    // 4. Count existing keys for order ({ count })
    queueResult(null, null, 0);
    // 5. Count existing keys per tier ({ count })
    queueResult(null, null, 0);
    // 6. Tier lookup for duration + product (.single())
    queueResult({ duration_days: 365, product: "symflofi" });
    // 7. Verify final count ({ count })
    queueResult(null, null, 1);
    // 8. Update keys_generated (awaited)
    queueResult(null);
    // 9. Update order status to paid (awaited)
    queueResult(null);

    const result = await pollPaymentStatus("order-1");
    expect(result).toEqual({ status: "paid" });
  });

  it("marks expired orders as cancelled", async () => {
    // 1. Order lookup
    queueResult({ id: "order-1", status: "pending", provider_session_id: "sess-123" });

    mockProvider.getSessionStatus.mockResolvedValue({
      orderId: "order-1",
      providerSessionId: "sess-123",
      status: "expired",
    });

    // 2. Update to cancelled
    queueResult(null);

    const result = await pollPaymentStatus("order-1");
    expect(result).toEqual({ status: "expired" });
  });

  it("throws when order is not found", async () => {
    queueResult(null);

    await expect(pollPaymentStatus("bad-id")).rejects.toThrow("Order not found");
  });
});
