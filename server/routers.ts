import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { hashPassword, verifyPassword, hashFingerprint } from "./auth-utils";
import { storagePut, storageGetSignedUrl } from "./storage";

// Client session middleware - validates client_session cookie
const clientSessionProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const sessionCookie = ctx.req.cookies?.client_session;
  if (!sessionCookie) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Não autenticado. Faça login.' });
  }
  try {
    const session = JSON.parse(sessionCookie);
    if (session.expiresAt && session.expiresAt < Date.now()) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sessão expirada' });
    }
    const credential = await db.getClientCredentialById(session.credentialId);
    if (!credential || !credential.active) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Conta inválida ou desativada' });
    }
    // Check if the credential itself has expired (in addition to session expiry)
    if (credential.expiresAt && new Date(credential.expiresAt) < new Date()) {
      // Auto-deactivate the credential to prevent further access
      await db.updateClientCredentialActive(credential.id, false);
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Este login expirou. Entre em contato com o administrador para renovar.' });
    }
    return next({ ctx: { ...ctx, clientSession: session, credential } });
  } catch (e) {
    if (e instanceof TRPCError) throw e;
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sessão inválida' });
  }
});

// Admin session middleware - validates admin_session cookie
const adminSessionProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const sessionCookie = ctx.req.cookies?.admin_session;
  if (!sessionCookie) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Não autenticado como admin' });
  }
  try {
    const session = JSON.parse(sessionCookie);
    if (session.expiresAt && session.expiresAt < Date.now()) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sessão expirada' });
    }
    return next({ ctx: { ...ctx, adminSession: session } });
  } catch (e) {
    if (e instanceof TRPCError) throw e;
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sessão inválida' });
  }
});

// Admin-only procedure (uses admin_session)
const adminProcedure = adminSessionProcedure;

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie("client_session", { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie("admin_session", { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // ============ CLIENT AUTH ============
    clientLogin: publicProcedure
      .input(z.object({
        username: z.string().min(1),
        password: z.string().min(1),
        deviceFingerprint: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const credential = await db.getClientCredentialByUsername(input.username);
        if (!credential) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Credenciais inválidas' });
        }
        if (!credential.active) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Esta conta está desativada. Entre em contato com o administrador.' });
        }
        // Check if account has expired
        if (credential.expiresAt && new Date(credential.expiresAt) < new Date()) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Este login expirou. Entre em contato com o administrador para renovar.' });
        }
        if (!verifyPassword(input.password, credential.passwordHash)) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Credenciais inválidas' });
        }

        // Device lock check (fingerprint + IP)
        const currentFingerprint = hashFingerprint([input.deviceFingerprint]);
        if (credential.deviceFingerprint) {
          if (credential.deviceFingerprint !== currentFingerprint) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Este login já está vinculado a outro dispositivo. Entre em contato com o administrador para resetar.'
            });
          }
        } else {
          // Lock device on first access
          const clientIP = (Array.isArray(ctx.req.headers['x-forwarded-for'])
            ? ctx.req.headers['x-forwarded-for'][0]
            : ctx.req.headers['x-forwarded-for']) || ctx.req.socket.remoteAddress || 'unknown';
          await db.setClientDevice(credential.id, currentFingerprint, clientIP);
        }

        await db.updateLastLogin(credential.id);

        const cookieOptions = getSessionCookieOptions(ctx.req);
        const sessionData = JSON.stringify({
          credentialId: credential.id,
          username: credential.username,
          credits: credential.credits,
          label: credential.label,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        });

        ctx.res.cookie("client_session", sessionData, {
          ...cookieOptions,
          maxAge: 24 * 60 * 60,
          httpOnly: false,
          sameSite: 'lax',
        });

        return {
          success: true,
          credential: {
            id: credential.id,
            username: credential.username,
            credits: credential.credits,
            label: credential.label,
          }
        };
      }),

    clientLogout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie("client_session", { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    clientMe: publicProcedure.query(async ({ ctx }) => {
      const sessionCookie = ctx.req.cookies?.client_session;
      if (!sessionCookie) return null;
      try {
        const session = JSON.parse(sessionCookie);
        if (session.expiresAt && session.expiresAt < Date.now()) {
          return null;
        }
        // Fetch fresh data from database so credits are always up-to-date
        const credential = await db.getClientCredentialById(session.credentialId);
        if (!credential || !credential.active) {
          return null;
        }
        // Check if account has expired
        if (credential.expiresAt && new Date(credential.expiresAt) < new Date()) {
          // Auto-deactivate
          await db.updateClientCredentialActive(credential.id, false);
          return null;
        }
        return {
          id: credential.id,
          username: credential.username,
          credits: credential.credits,
          label: credential.label || null,
          expiresAt: credential.expiresAt ? credential.expiresAt.toISOString() : null,
          durationDays: credential.durationDays,
        };
      } catch {
        return null;
      }
    }),

    // ============ ADMIN AUTH ============
    adminLogin: publicProcedure
      .input(z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check admin credentials from admin_credentials table
        const cred = await db.getAdminCredential(input.username);
        if (!cred) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Credenciais administrativas inválidas' });
        }
        if (!verifyPassword(input.password, cred.passwordHash)) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Credenciais administrativas inválidas' });
        }

        const cookieOptions = getSessionCookieOptions(ctx.req);
        const sessionData = JSON.stringify({
          id: cred.id,
          username: cred.username,
          role: 'admin',
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });

        ctx.res.cookie("admin_session", sessionData, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60,
          httpOnly: true,
          sameSite: 'lax',
        });

        return { success: true, username: cred.username };
      }),

    adminLogout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie("admin_session", { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    adminMe: publicProcedure.query(({ ctx }) => {
      const sessionCookie = ctx.req.cookies?.admin_session;
      if (!sessionCookie) return null;
      try {
        const session = JSON.parse(sessionCookie);
        if (session.expiresAt && session.expiresAt < Date.now()) {
          return null;
        }
        return {
          id: session.id,
          username: session.username,
          role: 'admin',
        };
      } catch {
        return null;
      }
    }),
  }),

  // ============ CLIENT PROCEDURES (protected by session) ============
  clientFiles: router({
    files: clientSessionProcedure.query(async ({ ctx }) => {
      const allFiles = await db.getAllFiles();
      return allFiles.map(f => ({
        id: f.id,
        filename: f.filename,
        originalName: f.originalName,
        fileSize: f.fileSize,
        mimeType: f.mimeType,
        description: f.description,
        createdAt: f.createdAt,
      }));
    }),

    downloadFile: clientSessionProcedure
      .input(z.object({ fileId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Check credits from DB (not session cookie) to prevent bypass
        const credential = await db.getClientCredentialById(ctx.clientSession.credentialId);
        if (!credential || credential.credits <= 0) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem créditos suficientes para download.' });
        }

        const clientIP = (Array.isArray(ctx.req.headers['x-forwarded-for'])
          ? ctx.req.headers['x-forwarded-for'][0]
          : ctx.req.headers['x-forwarded-for']) || ctx.req.socket.remoteAddress || 'unknown';

        const file = await db.getFileById(input.fileId);
        if (!file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Arquivo não encontrado' });
        }

        // Record download
        await db.createDownloadHistory({
          credentialId: ctx.clientSession.credentialId,
          fileId: file.id,
          ip: clientIP,
        });

        // Get signed URL for download
        const signedUrl = await storageGetSignedUrl(file.s3Key);
        return { downloadUrl: signedUrl, originalName: file.originalName };
      }),
  }),

  // ============ ADMIN PROCEDURES ============
  admin: router({
    // Clients CRUD
    listClients: adminProcedure.query(async () => {
      const clients = await db.getAllClientCredentials();
      return clients.map(c => ({
        id: c.id,
        username: c.username,
        active: c.active,
        credits: c.credits,
        label: c.label,
        role: c.role,
        durationDays: c.durationDays,
        expiresAt: c.expiresAt,
        deviceFingerprint: c.deviceFingerprint,
        deviceIP: c.deviceIP,
        deviceLockedAt: c.deviceLockedAt,
        lastLoginAt: c.lastLoginAt,
        createdAt: c.createdAt,
      }));
    }),

    createClient: adminProcedure
      .input(z.object({
        username: z.string().min(3).max(100),
        password: z.string().min(6),
        label: z.string().optional(),
        credits: z.number().int().min(0).optional(),
        role: z.enum(['client', 'admin']).optional(),
        durationDays: z.number().int().min(1).optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await db.getClientCredentialByUsername(input.username);
        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Este usuário já existe' });
        }
        const { hash } = hashPassword(input.password);
        const expiresAt = input.durationDays
          ? new Date(Date.now() + input.durationDays * 24 * 60 * 60 * 1000)
          : null;
        await db.createClientCredential({
          username: input.username,
          passwordHash: hash,
          label: input.label || null,
          credits: input.credits || 0,
          active: true,
          role: input.role || 'client',
          durationDays: input.durationDays || null,
          expiresAt: expiresAt,
        });
      }),

    updateClient: adminProcedure
      .input(z.object({
        id: z.number(),
        username: z.string().min(3).max(100),
        label: z.string().optional(),
        active: z.boolean(),
        durationDays: z.number().int().min(1).optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await db.getClientCredentialByUsername(input.username);
        if (existing && existing.id !== input.id) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Este usuário já existe' });
        }
        const expiresAt = input.durationDays
          ? new Date(Date.now() + input.durationDays * 24 * 60 * 60 * 1000)
          : undefined;
        await db.updateClientCredential(input.id, {
          username: input.username,
          label: input.label || null,
          active: input.active,
          durationDays: input.durationDays || null,
          ...(expiresAt !== undefined ? { expiresAt } : {}),
        });
      }),

    updateClientPassword: adminProcedure
      .input(z.object({
        id: z.number(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const { hash } = hashPassword(input.password);
        await db.updateClientCredential(input.id, { passwordHash: hash });
      }),

    toggleClientActive: adminProcedure
      .input(z.object({ id: z.number(), active: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.updateClientCredentialActive(input.id, input.active);
      }),

    addCredits: adminProcedure
      .input(z.object({
        id: z.number(),
        amount: z.number().int(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const credential = await db.getClientCredentialById(input.id);
        if (!credential) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Cliente não encontrado' });
        }
        const newCredits = credential.credits + input.amount;
        if (newCredits < 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Créditos não podem ser negativos' });
        }
        await db.updateClientCredentialCredits(input.id, newCredits);
        await db.createCreditTransaction({
          credentialId: input.id,
          amount: input.amount,
          reason: input.reason || `${input.amount > 0 ? 'Adição' : 'Remoção'} de ${Math.abs(input.amount)} créditos`,
          adminUserId: ctx.adminSession.id,
        });
      }),

    resetClientDevice: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.resetClientDevice(input.id);
      }),

    deleteClient: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteClientCredential(input.id);
      }),

    getCreditHistory: adminProcedure
      .input(z.object({ credentialId: z.number() }))
      .query(async ({ input }) => {
        const transactions = await db.getCreditTransactionsByCredential(input.credentialId);
        return transactions;
      }),

    // File management
    listFiles: adminProcedure.query(async () => {
      const allFiles = await db.getAllFiles();
      return allFiles;
    }),

    uploadFile: adminProcedure
      .input(z.object({
        filename: z.string().min(1),
        originalName: z.string().min(1),
        data: z.string(),
        mimeType: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.data, 'base64');
        const key = `files/${input.filename}`;
        const result = await storagePut(key, buffer, input.mimeType);
        await db.createFileRecord({
          filename: input.filename,
          originalName: input.originalName,
          s3Key: result.key,
          s3Url: result.url,
          fileSize: buffer.length,
          mimeType: input.mimeType,
          uploadAdminId: ctx.adminSession.id,
          description: input.description || null,
        });
      }),

    deleteFile: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteFileRecord(input.id);
      }),
  }),
});

export type AppRouter = typeof appRouter;
