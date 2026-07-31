import { and, eq, desc, sql } from "drizzle-orm";

import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import {
  clientCredentials,
  files,
  downloadHistory,
  creditTransactions,
  siteSettings,
  type InsertClientCredential,
  type InsertFile,
  type InsertDownloadHistory,
  type InsertCreditTransaction,
  type InsertSiteSetting,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ CLIENT CREDENTIALS ============

export async function getAllClientCredentials() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clientCredentials).orderBy(desc(clientCredentials.createdAt));
}

export async function getClientCredentialById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clientCredentials).where(eq(clientCredentials.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getClientCredentialByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clientCredentials).where(eq(clientCredentials.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getClientCredentialByLoginCode(loginCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clientCredentials).where(eq(clientCredentials.loginCode, loginCode)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createClientCredential(data: Omit<InsertClientCredential, 'id' | 'createdAt' | 'updatedAt' | 'lastLoginAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [inserted] = await db.insert(clientCredentials).values(data);
  return { id: Number(inserted.insertId) };
}

export async function updateClientCredential(id: number, data: Partial<InsertClientCredential>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const filtered = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
  await db.update(clientCredentials).set(filtered).where(eq(clientCredentials.id, id));
}

export async function updateClientCredentialActive(id: number, active: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clientCredentials).set({ active }).where(eq(clientCredentials.id, id));
}

export async function updateClientCredentialCredits(id: number, credits: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clientCredentials).set({ credits }).where(eq(clientCredentials.id, id));
}

export async function resetClientDevice(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clientCredentials).set({
    deviceFingerprint: null,
    deviceIP: null,
    deviceType: null,
    deviceLockedAt: null,
  }).where(eq(clientCredentials.id, id));
}

export async function setClientDevice(id: number, fingerprint: string, ip: string, deviceType?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clientCredentials).set({
    deviceFingerprint: fingerprint,
    deviceIP: ip,
    deviceType: deviceType || null,
    deviceLockedAt: new Date(),
  }).where(eq(clientCredentials.id, id));
}

export async function deleteClientCredential(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(clientCredentials).where(eq(clientCredentials.id, id));
}

export async function updateLastLogin(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clientCredentials).set({ lastLoginAt: new Date() }).where(eq(clientCredentials.id, id));
}

export async function updateClientIP(id: number, ip: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clientCredentials).set({ deviceIP: ip }).where(eq(clientCredentials.id, id));
}

export async function updateGenerationLimit(id: number, generationLimit: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clientCredentials).set({ generationLimit }).where(eq(clientCredentials.id, id));
}

export async function incrementGenerationsUsed(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clientCredentials).set({ generationsUsed: sql`COALESCE(generationsUsed, 0) + 1` }).where(eq(clientCredentials.id, id));
}

// ============ FILES ============

export async function getAllFiles() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(files).orderBy(desc(files.createdAt));
}

export async function getFileById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(files).where(eq(files.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createFileRecord(data: Omit<InsertFile, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [inserted] = await db.insert(files).values(data);
  return { id: Number(inserted.insertId) };
}

export async function deleteFileRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(files).where(eq(files.id, id));
}

// ============ DOWNLOAD HISTORY ============

export async function createDownloadHistory(data: Omit<InsertDownloadHistory, 'id' | 'downloadedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(downloadHistory).values(data);
}

// ============ CREDIT TRANSACTIONS ============

export async function createCreditTransaction(data: Omit<InsertCreditTransaction, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(creditTransactions).values(data);
}

// ============ ADMIN CREDENTIALS ============

export async function getAdminCredential(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clientCredentials)
    .where(and(eq(clientCredentials.username, username), eq(clientCredentials.role, 'admin')))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCreditTransactionsByCredential(credentialId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditTransactions)
    .where(eq(creditTransactions.credentialId, credentialId))
    .orderBy(desc(creditTransactions.createdAt));
}

// ============ SITE SETTINGS ============

export async function getSiteSetting(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(siteSettings)
    .where(eq(siteSettings.key, key))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function setSiteSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getSiteSetting(key);
  if (existing) {
    await db.update(siteSettings).set({ value }).where(eq(siteSettings.key, key));
  } else {
    await db.insert(siteSettings).values({ key, value });
  }
}

export async function getAllSiteSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(siteSettings);
}
