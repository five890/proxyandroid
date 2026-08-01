import { and, eq, desc, sql } from "drizzle-orm";

import { drizzle } from "drizzle-orm/mysql2";
import { eq as eqOp, desc as descOp } from 'drizzle-orm';
import { InsertUser, users } from "../drizzle/schema";
import {
  clientCredentials,
  files,
  downloadHistory,
  creditTransactions,
  siteSettings,
  activeSessions,
  accessLogs,
  auditLogs,
  usageStats,
  adminPermissions,
  securityEvents,
  type InsertClientCredential,
  type InsertFile,
  type InsertDownloadHistory,
  type InsertCreditTransaction,
  type InsertSiteSetting,
  type InsertActiveSession,
  type InsertAccessLog,
  type InsertAuditLog,
  type InsertUsageStat,
  type InsertAdminPermission,
  type InsertSecurityEvent,
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
  if (!db) {
    console.error('[DB] Database connection not available');
    return [];
  }
  try {
    const result = await db.select().from(clientCredentials).orderBy(desc(clientCredentials.createdAt));
    console.log('[DB] getAllClientCredentials returned', result.length, 'rows');
    return result;
  } catch (err: any) {
    console.error('[DB] getAllClientCredentials error:', err.message);
    return [];
  }
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
  console.log('[DB] Inserting client credential:', JSON.stringify(Object.keys(data)));
  const [inserted] = await db.insert(clientCredentials).values(data);
  console.log('[DB] Inserted client, insertId:', inserted.insertId);
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
// ============ ACTIVE SESSIONS (Login Limit) ============

export async function getActiveSessionCount(credentialId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`COUNT(*)` })
    .from(activeSessions)
    .where(eq(activeSessions.credentialId, credentialId));
  return Number(result[0]?.count || 0);
}

export async function createActiveSession(data: Omit<InsertActiveSession, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(activeSessions).values(data);
}

export async function removeActiveSession(credentialId: number, deviceFingerprint: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(activeSessions).where(
    and(eq(activeSessions.credentialId, credentialId), eq(activeSessions.deviceFingerprint, deviceFingerprint))
  );
}

export async function removeAllActiveSessions(credentialId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(activeSessions).where(eq(activeSessions.credentialId, credentialId));
}
export async function getActiveSessions(credentialId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activeSessions).where(eq(activeSessions.credentialId, credentialId));
}

// Get distinct active session count (count unique fingerprints)
export async function getDistinctActiveSessionCount(credentialId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`COUNT(DISTINCT ${activeSessions.deviceFingerprint})` })
    .from(activeSessions)
    .where(eq(activeSessions.credentialId, credentialId));
  return Number(result[0]?.count || 0);
}

// Get all active sessions with client info
export async function getAllActiveSessionsForClient(credentialId: number) {
  const db = await getDb();
  if (!db) return [];
  // Get distinct sessions grouped by fingerprint
  const rows = await db.execute(
    `SELECT deviceFingerprint, deviceIP, COUNT(*) as loginCount, MAX(createdAt) as lastActive FROM active_sessions WHERE credentialId = ? GROUP BY deviceFingerprint`,
    [credentialId]
  );
  return rows[0] as any[];
}

// ============ AUDIT LOGS ============
export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(auditLogs).values(data);
  return result;
}

export async function getAuditLogs(limit: number = 100, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);
}

export async function getAuditLogsByAdmin(adminId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).where(eq(auditLogs.adminId, adminId)).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

export async function getAuditLogsByTarget(targetType: string, targetId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).where(and(eq(auditLogs.targetType, targetType), eq(auditLogs.targetId, targetId))).orderBy(desc(auditLogs.createdAt));
}

// ============ USAGE STATS ============
export async function createUsageStat(data: InsertUsageStat) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(usageStats).values(data);
  return result;
}

export async function getUsageStats(credentialId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return [];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db.select().from(usageStats).where(and(eq(usageStats.credentialId, credentialId), gte(usageStats.date, startDate))).orderBy(desc(usageStats.date));
}

export async function getSystemStats() {
  const db = await getDb();
  if (!db) return null;
  const totalClients = await db.select({ count: sql<number>`COUNT(*)` }).from(clientCredentials).where(eq(clientCredentials.role, 'client'));
  const activeClients = await db.select({ count: sql<number>`COUNT(*)` }).from(clientCredentials).where(and(eq(clientCredentials.role, 'client'), eq(clientCredentials.active, true)));
  const totalCredits = await db.select({ sum: sql<number>`SUM(credits)` }).from(clientCredentials).where(eq(clientCredentials.role, 'client'));
  const totalLogins = await db.select({ count: sql<number>`COUNT(*)` }).from(activeSessions);
  
  return {
    totalClients: Number(totalClients[0]?.count || 0),
    activeClients: Number(activeClients[0]?.count || 0),
    totalCredits: Number(totalCredits[0]?.sum || 0),
    totalActiveSessions: Number(totalLogins[0]?.count || 0),
  };
}

// ============ ADMIN PERMISSIONS ============
export async function createAdminPermission(data: InsertAdminPermission) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(adminPermissions).values(data);
  return result;
}

export async function getAdminPermissions(adminId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(adminPermissions).where(eq(adminPermissions.adminId, adminId));
}

export async function hasAdminPermission(adminId: number, permission: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(adminPermissions).where(and(eq(adminPermissions.adminId, adminId), eq(adminPermissions.permission, permission), eq(adminPermissions.granted, true))).limit(1);
  return result.length > 0;
}

export async function grantAdminPermission(adminId: number, permission: string, grantedBy: number) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(adminPermissions).values({ adminId, permission, granted: true, grantedBy });
}

export async function revokeAdminPermission(adminId: number, permission: string) {
  const db = await getDb();
  if (!db) return null;
  return db.update(adminPermissions).set({ granted: false }).where(and(eq(adminPermissions.adminId, adminId), eq(adminPermissions.permission, permission)));
}

// ============ SECURITY EVENTS ============
export async function createSecurityEvent(data: InsertSecurityEvent) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(securityEvents).values(data);
  return result;
}

export async function getSecurityEvents(limit: number = 100, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(securityEvents).orderBy(desc(securityEvents.createdAt)).limit(limit).offset(offset);
}

export async function getUnresolvedSecurityEvents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(securityEvents).where(eq(securityEvents.resolved, false)).orderBy(desc(securityEvents.createdAt));
}

export async function resolveSecurityEvent(eventId: number) {
  const db = await getDb();
  if (!db) return null;
  return db.update(securityEvents).set({ resolved: true }).where(eq(securityEvents.id, eventId));
}

export async function getSecurityEventsByIP(ipAddress: string, hours: number = 24) {
  const db = await getDb();
  if (!db) return [];
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  return db.select().from(securityEvents).where(and(eq(securityEvents.ipAddress, ipAddress), gte(securityEvents.createdAt, startTime))).orderBy(desc(securityEvents.createdAt));
}


// ============ ACCESS LOGS ============
export async function createAccessLog(data: InsertAccessLog) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(accessLogs).values(data);
  return result;
}

export async function getAccessLogs(credentialId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(accessLogs).where(eq(accessLogs.credentialId, credentialId)).orderBy(desc(accessLogs.createdAt)).limit(limit);
}

export async function getAccessLogsByIP(ipAddress: string, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(accessLogs).where(eq(accessLogs.ipAddress, ipAddress)).orderBy(desc(accessLogs.createdAt)).limit(limit);
}

export async function getRecentAccessLogs(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(accessLogs).orderBy(desc(accessLogs.createdAt)).limit(limit);
}
