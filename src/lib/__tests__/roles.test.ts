import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase/server before importing the module under test
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  rpc: vi.fn(),
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

// Import after mocks are set up
const { getUserContext } = await import("@/lib/roles");

describe("getUserContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no user session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await getUserContext();
    expect(result).toBeNull();
  });

  it("returns admin role when is_admin() returns true", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: "user-1", email: "admin@test.com" },
      },
      error: null,
    });
    mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

    const result = await getUserContext();
    expect(result).toEqual({
      role: "admin",
      userId: "user-1",
      email: "admin@test.com",
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith("is_admin");
  });

  it("returns operator role with operator details", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: "user-2", email: "op@test.com" },
      },
      error: null,
    });
    mockSupabase.rpc.mockResolvedValue({ data: false, error: null });

    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: "op-1",
            is_distributor: true,
            operator_code: "SYMF-AB00-1234-5678",
          },
        ],
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockChain);

    const result = await getUserContext();
    expect(result).toEqual({
      role: "operator",
      userId: "user-2",
      email: "op@test.com",
      operatorId: "op-1",
      operatorCode: "SYMF-AB00-1234-5678",
      isDistributor: true,
    });
  });

  it("returns role null when user has no admin or operator record", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: "user-3", email: "nobody@test.com" },
      },
      error: null,
    });
    mockSupabase.rpc.mockResolvedValue({ data: false, error: null });

    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain);

    const result = await getUserContext();
    expect(result).toEqual({
      role: null,
      userId: "user-3",
      email: "nobody@test.com",
    });
  });
});
