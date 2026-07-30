import { describe, expect, it, vi } from "vitest";
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
}));

import * as db from "./db";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

function createMockContext(user?: any) {
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
        cookies: {},
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

describe("auth.clientLogin", () => {
  it("should reject login with invalid credentials", async () => {
    vi.mocked(db.getClientCredentialByUsername).mockResolvedValue(undefined);
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.clientLogin({
        username: "testuser",
        password: "wrong",
        deviceFingerprint: "fingerprint123",
      })
    ).rejects.toThrow("Credenciais inválidas");
  });

  it("should reject login for deactivated account", async () => {
    const { hash } = hashPassword("password123");
    vi.mocked(db.getClientCredentialByUsername).mockResolvedValue({
      id: 1,
      username: "testuser",
      passwordHash: hash,
      active: false,
      credits: 0,
      deviceFingerprint: null,
      deviceIP: null,
      deviceLockedAt: null,
      label: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    });
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.clientLogin({
        username: "testuser",
        password: "password123",
        deviceFingerprint: "fingerprint123",
      })
    ).rejects.toThrow("desativada");
  });

  it("should reject login on wrong device", async () => {
    const { hash } = hashPassword("password123");
    vi.mocked(db.getClientCredentialByUsername).mockResolvedValue({
      id: 1,
      username: "testuser",
      passwordHash: hash,
      active: true,
      credits: 10,
      deviceFingerprint: "different_fingerprint",
      deviceIP: "192.168.1.1",
      deviceLockedAt: new Date(),
      label: "Test User",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
    });
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.clientLogin({
        username: "testuser",
        password: "password123",
        deviceFingerprint: "new_device_fingerprint",
      })
    ).rejects.toThrow("outro dispositivo");
  });

  it("should accept login and lock device on first access", async () => {
    const { hash } = hashPassword("password123");
    vi.mocked(db.getClientCredentialByUsername).mockResolvedValue({
      id: 1,
      username: "testuser",
      passwordHash: hash,
      active: true,
      credits: 10,
      deviceFingerprint: null,
      deviceIP: null,
      deviceLockedAt: null,
      label: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    });
    vi.mocked(db.setClientDevice).mockResolvedValue(undefined);
    vi.mocked(db.updateLastLogin).mockResolvedValue(undefined);

    const { ctx, setCookies } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.clientLogin({
      username: "testuser",
      password: "password123",
      deviceFingerprint: "fingerprint123",
    });

    expect(result.success).toBe(true);
    expect(result.credential.username).toBe("testuser");
    expect(result.credential.credits).toBe(10);
    expect(db.setClientDevice).toHaveBeenCalledWith(1, expect.any(String), "192.168.1.1");
    expect(db.updateLastLogin).toHaveBeenCalledWith(1);
    expect(setCookies.some(c => c.name === "client_session")).toBe(true);
  });
});

describe("auth.clientMe", () => {
  it("should return null when no session cookie", async () => {
    const { ctx } = createMockContext();
    ctx.req.cookies = {};
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.clientMe();
    expect(result).toBeNull();
  });

  it("should return session data when valid cookie exists", async () => {
    const sessionData = JSON.stringify({
      credentialId: 1,
      username: "testuser",
      credits: 10,
      expiresAt: Date.now() + 86400000,
    });
    (db.getClientCredentialById as any).mockResolvedValue({
      id: 1,
      username: "testuser",
      credits: 10,
      active: true,
      label: "Test Client",
    });
    const { ctx } = createMockContext();
    ctx.req.cookies = { client_session: sessionData };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.clientMe();
    expect(result).toBeTruthy();
    expect((result as any).username).toBe("testuser");
  });
});

describe("auth.clientLogout", () => {
  it("should clear client session cookie", async () => {
    const { ctx, clearedCookies } = createMockContext();
    const caller = appRouter.createCaller(ctx);
    await caller.auth.clientLogout();
    expect(clearedCookies.some(c => c.name === "client_session")).toBe(true);
  });
});

describe("auth.adminLogin", () => {
  it("should reject login with invalid credentials", async () => {
    vi.mocked(db.getAdminCredential).mockResolvedValue(undefined);
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.adminLogin({
        username: "admin",
        password: "wrong",
      })
    ).rejects.toThrow("Credenciais administrativas inválidas");
  });

  it("should accept admin login and set session cookie", async () => {
    const { hash } = hashPassword("admin123");
    vi.mocked(db.getAdminCredential).mockResolvedValue({
      id: 1,
      username: "admin",
      passwordHash: hash,
      active: true,
      credits: 0,
      deviceFingerprint: null,
      deviceIP: null,
      deviceLockedAt: null,
      label: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      role: "admin",
    });
    const { ctx, setCookies } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.adminLogin({
      username: "admin",
      password: "admin123",
    });

    expect(result.success).toBe(true);
    expect(result.username).toBe("admin");
    expect(setCookies.some(c => c.name === "admin_session")).toBe(true);
  });
});

describe("auth.adminMe", () => {
  it("should return null when no admin session cookie", async () => {
    const { ctx } = createMockContext();
    ctx.req.cookies = {};
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.adminMe();
    expect(result).toBeNull();
  });

  it("should return admin data when valid cookie exists", async () => {
    const sessionData = JSON.stringify({
      id: 1,
      username: "admin",
      role: "admin",
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    const { ctx } = createMockContext();
    ctx.req.cookies = { admin_session: sessionData };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.adminMe();
    expect(result).toBeTruthy();
    expect((result as any).username).toBe("admin");
    expect((result as any).role).toBe("admin");
  });
});

describe("auth.adminLogout", () => {
  it("should clear admin session cookie", async () => {
    const { ctx, clearedCookies } = createMockContext();
    const caller = appRouter.createCaller(ctx);
    await caller.auth.adminLogout();
    expect(clearedCookies.some(c => c.name === "admin_session")).toBe(true);
  });
});
