import { describe, it, expect, vi, beforeEach } from "vitest";

// -- Mocks --

const mockSupabase = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

const mockGetUserContext = vi.fn();
vi.mock("@/lib/roles", () => ({
  getUserContext: (...args: unknown[]) => mockGetUserContext(...args),
}));

vi.mock("@/lib/audit", () => ({
  logAdminAction: vi.fn(),
}));

// Capture fetch calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { toggleSSH, getSSHStatus } = await import("../actions");

// -- Helpers --

const adminCtx = { role: "admin", userId: "u-1", email: "admin@test.com" };

const fakeMachine = {
  machine_uuid: "uuid-abc",
  license_key: "LK-123",
  wg_ip: "10.0.0.5",
  name: "TestBox",
  is_online: true,
};

function mockMachineQuery(data: typeof fakeMachine | null, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
  mockSupabase.from.mockReturnValue(chain);
  return chain;
}

// -- Tests --

describe("toggleSSH", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthorized for non-admin users", async () => {
    mockGetUserContext.mockResolvedValue({ role: "operator", userId: "u-2" });
    const res = await toggleSSH("m-1", true);
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("returns unauthorized when not logged in", async () => {
    mockGetUserContext.mockResolvedValue(null);
    const res = await toggleSSH("m-1", true);
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("returns error when machine not found", async () => {
    mockGetUserContext.mockResolvedValue(adminCtx);
    mockMachineQuery(null, { message: "not found" });

    const res = await toggleSSH("m-1", true);
    expect(res).toEqual({ error: "Machine not found" });
  });

  it("returns error when machine has no WireGuard IP", async () => {
    mockGetUserContext.mockResolvedValue(adminCtx);
    mockMachineQuery({ ...fakeMachine, wg_ip: null as unknown as string });

    const res = await toggleSSH("m-1", true);
    expect(res).toEqual({ error: "No WireGuard tunnel — device has no remote access" });
  });

  it("returns error when machine has no license key", async () => {
    mockGetUserContext.mockResolvedValue(adminCtx);
    mockMachineQuery({ ...fakeMachine, license_key: null as unknown as string });

    const res = await toggleSSH("m-1", true);
    expect(res).toEqual({ error: "No license key configured on device" });
  });

  it("enables SSH and returns success", async () => {
    mockGetUserContext.mockResolvedValue(adminCtx);
    mockMachineQuery(fakeMachine);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sshEnabled: true }),
    });

    const res = await toggleSSH("m-1", true);
    expect(res).toEqual({ success: true, sshEnabled: true });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/platform/ssh"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ enabled: true }),
      }),
    );
  });

  it("disables SSH and returns success", async () => {
    mockGetUserContext.mockResolvedValue(adminCtx);
    mockMachineQuery(fakeMachine);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sshEnabled: false }),
    });

    const res = await toggleSSH("m-1", false);
    expect(res).toEqual({ success: true, sshEnabled: false });
  });

  it("returns error when device returns non-ok response", async () => {
    mockGetUserContext.mockResolvedValue(adminCtx);
    mockMachineQuery(fakeMachine);
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      text: () => Promise.resolve("Bad Gateway"),
    });

    const res = await toggleSSH("m-1", true);
    expect(res).toEqual({ error: "Device returned 502: Bad Gateway" });
  });

  it("returns timeout error on fetch abort", async () => {
    mockGetUserContext.mockResolvedValue(adminCtx);
    mockMachineQuery(fakeMachine);
    mockFetch.mockRejectedValue(new Error("The operation was aborted due to timeout"));

    const res = await toggleSSH("m-1", true);
    expect(res).toEqual({ error: "Device is unreachable (timeout)" });
  });

  it("returns generic error on network failure", async () => {
    mockGetUserContext.mockResolvedValue(adminCtx);
    mockMachineQuery(fakeMachine);
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    const res = await toggleSSH("m-1", true);
    expect(res).toEqual({ error: "Failed to reach device: ECONNREFUSED" });
  });

  it("sends correct headers to VPS", async () => {
    mockGetUserContext.mockResolvedValue(adminCtx);
    mockMachineQuery(fakeMachine);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sshEnabled: true }),
    });

    await toggleSSH("m-1", true);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers).toEqual(
      expect.objectContaining({
        "Content-Type": "application/json",
        "X-Device-Id": "uuid-abc",
        "X-Platform-Key": "LK-123",
      }),
    );
  });
});

describe("getSSHStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthorized for non-admin", async () => {
    mockGetUserContext.mockResolvedValue({ role: "operator" });
    const res = await getSSHStatus("m-1");
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("returns error when machine has no remote access", async () => {
    mockGetUserContext.mockResolvedValue(adminCtx);
    mockMachineQuery({ ...fakeMachine, wg_ip: null as unknown as string });

    const res = await getSSHStatus("m-1");
    expect(res).toEqual({ error: "No remote access" });
  });

  it("returns SSH status from device", async () => {
    mockGetUserContext.mockResolvedValue(adminCtx);
    mockMachineQuery(fakeMachine);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sshEnabled: false }),
    });

    const res = await getSSHStatus("m-1");
    expect(res).toEqual({ sshEnabled: false });
  });

  it("returns device unreachable on fetch failure", async () => {
    mockGetUserContext.mockResolvedValue(adminCtx);
    mockMachineQuery(fakeMachine);
    mockFetch.mockRejectedValue(new Error("network error"));

    const res = await getSSHStatus("m-1");
    expect(res).toEqual({ error: "Device unreachable" });
  });

  it("returns device unreachable on non-ok response", async () => {
    mockGetUserContext.mockResolvedValue(adminCtx);
    mockMachineQuery(fakeMachine);
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const res = await getSSHStatus("m-1");
    expect(res).toEqual({ error: "Device unreachable" });
  });
});
