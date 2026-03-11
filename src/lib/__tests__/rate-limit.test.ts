import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Upstash modules
const mockLimit = vi.fn();

vi.mock("@upstash/ratelimit", () => {
  class MockRatelimit {
    limit = mockLimit;
    static slidingWindow() {
      return {};
    }
  }
  return { Ratelimit: MockRatelimit };
});

vi.mock("@upstash/redis", () => {
  class MockRedis {}
  return { Redis: MockRedis };
});

const { rateLimit, paymentLimiter } = await import("@/lib/rate-limit");

describe("rateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when under limit", async () => {
    mockLimit.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 60000,
    });

    const result = await rateLimit(paymentLimiter, "user-1");

    expect(result).toBeNull();
    expect(mockLimit).toHaveBeenCalledWith("user-1");
  });

  it("returns 429 response when rate limited", async () => {
    const resetTime = Date.now() + 60000;
    mockLimit.mockResolvedValue({
      success: false,
      limit: 5,
      remaining: 0,
      reset: resetTime,
    });

    const result = await rateLimit(paymentLimiter, "user-1");

    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);

    const body = await result!.json();
    expect(body.error).toBe("Too many requests");

    expect(result!.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(result!.headers.get("X-RateLimit-Remaining")).toBe("0");
  });
});
