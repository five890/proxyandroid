import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { hashPassword } from "./auth-utils";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getClientCredentialByUsername: vi.fn(),
  getClientCredentialById: vi.fn(),
  createClientCredential: vi.fn(),
  updateClientCredential: vi.fn(),
  updateClientCredentialActive: vi.fn(),
  updateClientCredentialCredits: vi.fn(),
  resetClientDevice: vi.fn(),
  setClientDevice: vi.fn(),
  deleteClientCredential: vi.fn(),
  updateLastLogin: vi.fn(),
  updateClientIP: vi.fn(),
  getAllFiles: vi.fn(),
  getFileById: vi.fn(),
  createFileRecord: vi.fn(),
  deleteFileRecord: vi.fn(),
  createDownloadHistory: vi.fn(),
  createCreditTransaction: vi.fn(),
  getCreditTransactionsByCredential: vi.fn(),
  getAllClientCredentials: vi.fn(),
  listFiles: vi.fn(),
  getAdminCredential: vi.fn(),
  getSiteSetting: vi.fn(),
  storageGetSignedUrl: vi.fn(),
}));

import * as db from "./db";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

function createMockContext(cookies: Record<string, string> = {}, user?: any) {
  const setCookies: CookieCall[] = [];
  const clearedCookies: CookieCall[] = [];

  return {
    ctx: {
      user: user || null,
      req: {
        protocol: "https",
        headers: {
          "x-forwarded-for": "192.168.1.1",
        },
        cookies: { ...cookies },
        socket: { remoteAddress: "127.0.0.1" },
      } as any,
      res: {
        cookie: (name: string, value: string, options: Record<string, unknown>) => {
          setCookies.push({ name, options });
        },
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as any,
    },
    setCookies,
    clearedCookies,
  };
}

describe("Expiration protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clientLogin should reject when credential is expired", async () => {
    const { hash } = hashPassword("password123");
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
    vi.mocked(db.getClientCredentialByUsername).mockResolvedValue({
      id: 1,
      username: "testuser",
      passwordHash: hash,
      active: true,
      credits: 10,
      deviceFingerprint: null,
      deviceIP: null,
      deviceLockedAt: null,
      label: "Test",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      expiresAt: pastDate,
      durationDays: 1,
      role: "client",
    });
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.clientLogin({
        username: "testuser",
        password: "password123",
        deviceFingerprint: "fingerprint123",
      })
    ).rejects.toThrow("expirou");
  });

  it("clientLogin should accept when credential is not expired", async () => {
    const { hash } = hashPassword("password123");
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now
    vi.mocked(db.getClientCredentialByUsername).mockResolvedValue({
      id: 1,
      username: "testuser",
      passwordHash: hash,
      active: true,
      credits: 10,
      deviceFingerprint: null,
      deviceIP: null,
      deviceLockedAt: null,
      label: "Test",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      expiresAt: futureDate,
      durationDays: 1,
      role: "client",
    });
    vi.mocked(db.setClientDevice).mockResolvedValue(undefined);
    vi.mocked(db.updateLastLogin).mockResolvedValue(undefined);
    vi.mocked(db.updateClientIP).mockResolvedValue(undefined);

    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.clientLogin({
      username: "testuser",
      password: "password123",
      deviceFingerprint: "fingerprint123",
    });

    expect(result.success).toBe(true);
  });

  it("clientMe should return null when credential is expired and auto-deactivate", async () => {
    const sessionData = JSON.stringify({
      credentialId: 1,
      username: "testuser",
      credits: 10,
      expiresAt: Date.now() + 86400000, // session still valid
    });
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // expired
    vi.mocked(db.getClientCredentialById).mockResolvedValue({
      id: 1,
      username: "testuser",
      credits: 10,
      active: true,
      label: "Test",
      expiresAt: pastDate,
      durationDays: 1,
      role: "client",
    });
    vi.mocked(db.updateClientCredentialActive).mockResolvedValue(undefined);

    const { ctx } = createMockContext({ client_session: sessionData });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.clientMe();

    expect(result).toBeNull();
    expect(db.updateClientCredentialActive).toHaveBeenCalledWith(1, false);
  });

  it("clientMe should return null when credential has no expiry (unlimited)", async () => {
    const sessionData = JSON.stringify({
      credentialId: 1,
      username: "testuser",
      credits: 10,
      expiresAt: Date.now() + 86400000,
    });
    vi.mocked(db.getClientCredentialById).mockResolvedValue({
      id: 1,
      username: "testuser",
      credits: 10,
      active: true,
      label: "Test",
      expiresAt: null,
      durationDays: null,
      role: "client",
    });

    const { ctx } = createMockContext({ client_session: sessionData });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.clientMe();

    expect(result).toBeTruthy();
    expect((result as any).username).toBe("testuser");
  });

  it("clientFiles.files should reject when credential is expired", async () => {
    const sessionData = JSON.stringify({
      credentialId: 1,
      username: "testuser",
      credits: 10,
      expiresAt: Date.now() + 86400000, // session still valid
    });
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    vi.mocked(db.getClientCredentialById).mockResolvedValue({
      id: 1,
      username: "testuser",
      credits: 10,
      active: true,
      label: "Test",
      expiresAt: pastDate,
      durationDays: 1,
      role: "client",
    });
    vi.mocked(db.updateClientCredentialActive).mockResolvedValue(undefined);

    const { ctx } = createMockContext({ client_session: sessionData });
    const caller = appRouter.createCaller(ctx);

    await expect(caller.clientFiles.files()).rejects.toThrow("expirou");
    expect(db.updateClientCredentialActive).toHaveBeenCalledWith(1, false);
  });

  it("clientFiles.downloadFile should reject when credential is expired", async () => {
    const sessionData = JSON.stringify({
      credentialId: 1,
      username: "testuser",
      credits: 10,
      expiresAt: Date.now() + 86400000,
    });
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    vi.mocked(db.getClientCredentialById).mockResolvedValue({
      id: 1,
      username: "testuser",
      credits: 10,
      active: true,
      label: "Test",
      expiresAt: pastDate,
      durationDays: 1,
      role: "client",
    });
    vi.mocked(db.updateClientCredentialActive).mockResolvedValue(undefined);

    const { ctx } = createMockContext({ client_session: sessionData });
    const caller = appRouter.createCaller(ctx);

    await expect(caller.clientFiles.downloadFile({ fileId: 1 })).rejects.toThrow("expirou");
    expect(db.updateClientCredentialActive).toHaveBeenCalledWith(1, false);
  });

  it("clientMe should return full data with expiration info when valid", async () => {
    const sessionData = JSON.stringify({
      credentialId: 1,
      username: "testuser",
      credits: 10,
      expiresAt: Date.now() + 86400000,
    });
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    vi.mocked(db.getClientCredentialById).mockResolvedValue({
      id: 1,
      username: "testuser",
      credits: 10,
      active: true,
      label: "Test User",
      expiresAt: futureDate,
      durationDays: 1,
      role: "client",
    });

    const { ctx } = createMockContext({ client_session: sessionData });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.clientMe();

    expect(result).toBeTruthy();
    expect((result as any).username).toBe("testuser");
    expect((result as any).expiresAt).toBeTruthy();
    expect((result as any).durationDays).toBe(1);
  });
});
