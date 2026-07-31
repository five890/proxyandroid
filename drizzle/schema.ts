import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, bigint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Client credentials table - logins criados pelo admin
 */
export const clientCredentials = mysqlTable("client_credentials", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 256 }).notNull(),
  active: boolean("active").default(true).notNull(),
  credits: int("credits").default(0).notNull(),
  durationDays: int("durationDays"),
  expiresAt: timestamp("expiresAt"),
  deviceFingerprint: varchar("deviceFingerprint", { length: 512 }),
  deviceIP: varchar("deviceIP", { length: 64 }),
  deviceType: varchar("deviceType", { length: 32 }),
  deviceLockedAt: timestamp("deviceLockedAt"),
  label: text("label"),
  loginCode: varchar("loginCode", { length: 32 }),
  role: mysqlEnum("role", ["client", "admin", "mini_admin"]).default("client").notNull(),
  createdByMiniAdminId: int("createdByMiniAdminId"),
  createdByAdmin: varchar("createdByAdmin", { length: 100 }),
  activated: boolean("activated").default(false).notNull(),
  accessKey: text("accessKey"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastLoginAt: timestamp("lastLoginAt"),
  generationLimit: int("generationLimit").default(0).notNull(),
  generationsUsed: int("generationsUsed").default(0).notNull(),
  loginLimit: int("loginLimit").default(1).notNull(),
  accessType: mysqlEnum("accessType", ["proxy_ios", "proxy_android"]).default("proxy_ios").notNull(),
});

export type ClientCredential = typeof clientCredentials.$inferSelect;
export type InsertClientCredential = typeof clientCredentials.$inferInsert;

/**
 * Active sessions table - para controlar limite de logins simultâneos
 */
export const activeSessions = mysqlTable("active_sessions", {
  id: int("id").autoincrement().primaryKey(),
  credentialId: int("credentialId").notNull(),
  deviceFingerprint: varchar("deviceFingerprint", { length: 512 }).notNull(),
  deviceIP: varchar("deviceIP", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActiveSession = typeof activeSessions.$inferSelect;
export type InsertActiveSession = typeof activeSessions.$inferInsert;

/**
 * Downloadable files table
 */
export const files = mysqlTable("files", {
  id: int("id").autoincrement().primaryKey(),
  filename: varchar("filename", { length: 256 }).notNull(),
  originalName: varchar("originalName", { length: 256 }).notNull(),
  s3Key: varchar("s3Key", { length: 512 }).notNull(),
  s3Url: text("s3Url").notNull(),
  fileSize: bigint("fileSize", { mode: "number" }),
  mimeType: varchar("mimeType", { length: 128 }),
  uploadAdminId: int("uploadAdminId"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type File = typeof files.$inferSelect;
export type InsertFile = typeof files.$inferInsert;

/**
 * Download history - registro de quem baixou o que
 */
export const downloadHistory = mysqlTable("download_history", {
  id: int("id").autoincrement().primaryKey(),
  credentialId: int("credentialId").notNull(),
  fileId: int("fileId").notNull(),
  downloadedAt: timestamp("downloadedAt").defaultNow().notNull(),
  ip: varchar("ip", { length: 64 }),
});

export type DownloadHistory = typeof downloadHistory.$inferSelect;
export type InsertDownloadHistory = typeof downloadHistory.$inferInsert;

/**
 * Credit transactions - histórico de adição/remoção de créditos
 */
export const creditTransactions = mysqlTable("credit_transactions", {
  id: int("id").autoincrement().primaryKey(),
  credentialId: int("credentialId").notNull(),
  amount: int("amount").notNull(),
  reason: text("reason"),
  adminUserId: int("adminUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = typeof creditTransactions.$inferInsert;

/**
 * Site settings - configurações globais do portal
 */
export const siteSettings = mysqlTable("site_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = typeof siteSettings.$inferInsert;
