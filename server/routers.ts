import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { hashPassword, verifyPassword, hashFingerprint, generateLoginCode } from "./auth-utils";
import { storagePut, storageGetSignedUrl } from "./storage";

// ============================================================
// PROPRIETÁRIO: O único usuário que tem poder total é "murillo"
// Ninguém mais pode criar/editar/excluir admins ou ver IPs
// ============================================================
const OWNER_USERNAME = "murillo";

function isOwner(session: any): boolean {
  return session && session.username === OWNER_USERNAME;
}

function requireOwner(ctx: any): void {
  if (!isOwner(ctx.adminSession)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Acesso restrito ao proprietário. Esta ação só pode ser feita por ' + OWNER_USERNAME,
    });
  }
}

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
    if (credential.expiresAt && new Date(credential.expiresAt) < new Date()) {
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

// Mini admin session middleware
const miniAdminProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const sessionCookie = ctx.req.cookies?.admin_session;
  if (!sessionCookie) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Não autenticado como admin' });
  }
  try {
    const session = JSON.parse(sessionCookie);
    if (session.expiresAt && session.expiresAt < Date.now()) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sessão expirada' });
    }
    if (session.role !== 'mini_admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a mini administradores' });
    }
    return next({ ctx: { ...ctx, adminSession: session } });
  } catch (e) {
    if (e instanceof TRPCError) throw e;
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sessão inválida' });
  }
});

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
        loginCode: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        let credential = await db.getClientCredentialByUsername(input.username);
        if (!credential && input.loginCode) {
          credential = await db.getClientCredentialByLoginCode(input.loginCode);
        }
        if (!credential) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Credenciais inválidas' });
        }
        if (!credential.active) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Esta conta está desativada. Entre em contato com o administrador.' });
        }
        if (credential.expiresAt && new Date(credential.expiresAt) < new Date()) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Este login expirou. Entre em contato com o administrador para renovar.' });
        }
        if (!verifyPassword(input.password, credential.passwordHash)) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Credenciais inválidas' });
        }

        // Device lock check
        const currentFingerprint = hashFingerprint([input.deviceFingerprint]);
        if (credential.deviceFingerprint) {
          if (credential.deviceFingerprint !== currentFingerprint) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Este login já está vinculado a outro dispositivo. Entre em contato com o administrador para resetar.'
            });
          }
        } else {
          const clientIP = (Array.isArray(ctx.req.headers['x-forwarded-for'])
            ? ctx.req.headers['x-forwarded-for'][0]
            : ctx.req.headers['x-forwarded-for']) || ctx.req.socket.remoteAddress || 'unknown';
          await db.setClientDevice(credential.id, currentFingerprint, clientIP);
        }

        const currentIP = (Array.isArray(ctx.req.headers['x-forwarded-for'])
          ? ctx.req.headers['x-forwarded-for'][0]
          : ctx.req.headers['x-forwarded-for']) || ctx.req.socket.remoteAddress || 'unknown';
        await db.updateClientIP(credential.id, currentIP);
        await db.updateLastLogin(credential.id);

        const cookieOptions = getSessionCookieOptions(ctx.req);
        const sessionData = JSON.stringify({
          credentialId: credential.id,
          username: credential.username,
          credits: credential.credits,
          label: credential.label,
          loginCode: credential.loginCode,
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
            loginCode: credential.loginCode,
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
        const credential = await db.getClientCredentialById(session.credentialId);
        if (!credential || !credential.active) {
          return null;
        }
        if (credential.expiresAt && new Date(credential.expiresAt) < new Date()) {
          await db.updateClientCredentialActive(credential.id, false);
          return null;
        }
        const activationSetting = await db.getSiteSetting('activation_url');
        const globalAccessKeySetting = await db.getSiteSetting('access_key');
        const accessKey = credential.accessKey || globalAccessKeySetting?.value || null;
        return {
          id: credential.id,
          username: credential.username,
          credits: credential.credits,
          label: credential.label || null,
          loginCode: credential.loginCode || null,
          expiresAt: credential.expiresAt ? credential.expiresAt.toISOString() : null,
          durationDays: credential.durationDays,
          activated: credential.activated || false,
          activationUrl: activationSetting?.value || null,
          accessKey,
        };
      } catch {
        return null;
      }
    }),

    activateAccount: clientSessionProcedure.mutation(async ({ ctx }) => {
      const credential = await db.getClientCredentialById(ctx.clientSession.credentialId);
      if (!credential) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Conta não encontrada' });
      }
      if (credential.activated) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta conta já está ativada' });
      }
      if (credential.credits < 1) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Você precisa de pelo menos 1 crédito para ativar sua conta' });
      }

      const activationSetting = await db.getSiteSetting('activation_url');
      const globalAccessKeySetting = await db.getSiteSetting('access_key');
      const accessKey = credential.accessKey || globalAccessKeySetting?.value || null;

      await db.updateClientCredential(credential.id, {
        activated: true,
        credits: credential.credits - 1,
      });

      await db.createCreditTransaction({
        credentialId: credential.id,
        amount: -1,
        reason: 'Ativação de conta - Key utilizada',
      });

      return { success: true, remainingCredits: credential.credits - 1, accessKey };
    }),

    // ============ ADMIN AUTH ============
    adminLogin: publicProcedure
      .input(z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        // First check admin_credentials table
        const adminCred = await db.getAdminCredential(input.username);
        if (adminCred) {
          if (!verifyPassword(input.password, adminCred.passwordHash)) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Credenciais administrativas inválidas' });
          }
          const cookieOptions = getSessionCookieOptions(ctx.req);
          const sessionData = JSON.stringify({
            id: adminCred.id,
            username: adminCred.username,
            role: 'admin',
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          });
          ctx.res.cookie("admin_session", sessionData, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60,
            httpOnly: false,
            sameSite: 'lax',
          });
          return { success: true, username: adminCred.username, role: 'admin' };
        }

        // Then check mini_admin credentials from client_credentials table
        const miniAdminCred = await db.getClientCredentialByUsername(input.username);
        if (miniAdminCred && miniAdminCred.role === 'mini_admin') {
          if (!verifyPassword(input.password, miniAdminCred.passwordHash)) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Credenciais administrativas inválidas' });
          }
          if (!miniAdminCred.active) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Esta conta está desativada' });
          }
          const cookieOptions = getSessionCookieOptions(ctx.req);
          const sessionData = JSON.stringify({
            id: miniAdminCred.id,
            username: miniAdminCred.username,
            role: 'mini_admin',
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          });
          ctx.res.cookie("admin_session", sessionData, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60,
            httpOnly: false,
            sameSite: 'lax',
          });
          return { success: true, username: miniAdminCred.username, role: 'mini_admin' };
        }

        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Credenciais administrativas inválidas' });
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
          role: session.role || 'admin',
          isOwner: session.username === OWNER_USERNAME,
        };
      } catch {
        return null;
      }
    }),
  }),

  // ============ ADMIN PROCEDURES ============
  admin: router({
    // Settings CRUD (SÓ PROPRIETÁRIO)
    getSettings: adminProcedure.query(async ({ ctx }) => {
      requireOwner(ctx);
      const settings = await db.getAllSiteSettings();
      const map: Record<string, string> = {};
      settings.forEach(s => { map[s.key] = s.value || ''; });
      return map;
    }),

    updateSettings: adminProcedure
      .input(z.object({
        activationUrl: z.string().optional(),
        accessKey: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        requireOwner(ctx);
        if (input.activationUrl !== undefined) {
          await db.setSiteSetting('activation_url', input.activationUrl);
        }
        if (input.accessKey !== undefined) {
          await db.setSiteSetting('access_key', input.accessKey);
        }
        return { success: true };
      }),

    // Clients CRUD
    // PROTECTED: IPs only visible to owner
    listClients: adminProcedure.query(async ({ ctx }) => {
      const clients = await db.getAllClientCredentials();
      const owner = isOwner(ctx.adminSession);
      return clients.map(c => ({
        id: c.id,
        username: c.username,
        active: c.active,
        credits: c.credits,
        label: c.label,
        role: c.role,
        durationDays: c.durationDays,
        expiresAt: c.expiresAt,
        // IP e dados do dispositivo do proprietário nunca são exibidos
        deviceFingerprint: (owner && c.username !== 'murillo') ? c.deviceFingerprint : null,
        deviceIP: null,
        deviceLockedAt: (owner && c.username !== 'murillo') ? c.deviceLockedAt : null,
        lastLoginAt: owner ? c.lastLoginAt : null,
        createdAt: c.createdAt,
        loginCode: c.loginCode,
        generationLimit: c.generationLimit || 0,
        generationsUsed: c.generationsUsed || 0,
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
        accessKey: z.string().optional(),
        generationLimit: z.number().int().min(0).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Admins e o proprietário podem criar clientes
        const role = 'client';
        const existing = await db.getClientCredentialByUsername(input.username);
        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Este usuário já existe' });
        }
        const { hash } = hashPassword(input.password);
        const expiresAt = input.durationDays
          ? new Date(Date.now() + input.durationDays * 24 * 60 * 60 * 1000)
          : null;
        const loginCode = generateLoginCode();
        // Aplicar accessKey global automaticamente se não for fornecida
        const globalAccessKeySetting = await db.getSiteSetting('access_key');
        const finalAccessKey = input.accessKey || globalAccessKeySetting?.value || null;
        const result = await db.createClientCredential({
          username: input.username,
          passwordHash: hash,
          label: input.label || null,
          credits: 1,
          active: true,
          role,
          durationDays: input.durationDays || null,
          expiresAt: expiresAt,
          loginCode,
          activated: false,
          accessKey: finalAccessKey,
          generationLimit: input.generationLimit || 0,
          generationsUsed: 0,
        });
        return { id: result.id, loginCode, username: input.username, accessKey: finalAccessKey };
      }),

    updateClient: adminProcedure
      .input(z.object({
        id: z.number(),
        username: z.string().min(3).max(100),
        label: z.string().optional(),
        active: z.boolean(),
        durationDays: z.number().int().min(1).optional(),
        accessKey: z.string().optional(),
        generationLimit: z.number().int().min(0).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Admins e proprietário podem editar clientes
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
          ...(input.accessKey !== undefined ? { accessKey: input.accessKey || null } : {}),
          ...(input.generationLimit !== undefined ? { generationLimit: input.generationLimit } : {}),
        });
      }),

    updateClientPassword: adminProcedure
      .input(z.object({
        id: z.number(),
        password: z.string().min(6),
      }))
      .mutation(async ({ ctx, input }) => {
        const { hash } = hashPassword(input.password);
        await db.updateClientCredential(input.id, { passwordHash: hash });
      }),

    regenerateLoginCode: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const loginCode = generateLoginCode();
        await db.updateClientCredential(input.id, { loginCode });
        return { loginCode };
      }),

    toggleClientActive: adminProcedure
      .input(z.object({ id: z.number(), active: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
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
      .mutation(async ({ ctx, input }) => {
        await db.resetClientDevice(input.id);
      }),

    updateGenerationLimit: adminProcedure
      .input(z.object({
        id: z.number(),
        generationLimit: z.number().int().min(0),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateGenerationLimit(input.id, input.generationLimit);
      }),

    resetGenerations: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateClientCredential(input.id, { generationsUsed: 0 });
      }),

    deleteClient: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const client = await db.getClientCredentialById(input.id);
        if (!client) throw new TRPCError({ code: 'NOT_FOUND', message: 'Cliente não encontrado' });
        // Proteção: não pode deletar o próprio proprietário
        if (client.username === OWNER_USERNAME) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Impossível excluir o proprietário' });
        }
        await db.deleteClientCredential(input.id);
      }),

    getCreditHistory: adminProcedure
      .input(z.object({ credentialId: z.number() }))
      .query(async ({ input }) => {
        const transactions = await db.getCreditTransactionsByCredential(input.credentialId);
        return transactions;
      }),

    // File management
    listFiles: adminProcedure.query(async ({ ctx }) => {
      requireOwner(ctx);
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
        requireOwner(ctx);
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
      .mutation(async ({ ctx, input }) => {
        requireOwner(ctx);
        await db.deleteFileRecord(input.id);
      }),

    // ============ GERENCIAMENTO DE ADMINS (SÓ PROPRIETÁRIO) ============
    listAdmins: adminProcedure.query(async ({ ctx }) => {
      requireOwner(ctx);
      // Todos os admins podem ver a lista, mas IPs são protegidos
      const creds = await db.getAllClientCredentials();
      const owner = isOwner(ctx.adminSession);
      return creds
        .filter(c => c.role === 'admin')
        .map(c => ({
          id: c.id,
          username: c.username,
          active: c.active,
          createdAt: c.createdAt.toISOString(),
          // IP do proprietário nunca é exibido
          deviceIP: (owner && c.username !== 'murillo') ? c.deviceIP : null,
          deviceFingerprint: (owner && c.username !== 'murillo') ? c.deviceFingerprint : null,
          lastLoginAt: owner ? c.lastLoginAt : null,
        }));
    }),

    createAdmin: adminProcedure
      .input(z.object({
        username: z.string().min(3).max(100),
        password: z.string().min(6),
      }))
      .mutation(async ({ ctx, input }) => {
        requireOwner(ctx);
        const existing = await db.getClientCredentialByUsername(input.username);
        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Este usuário já existe' });
        }
        const { hash } = hashPassword(input.password);
        const result = await db.createClientCredential({
          username: input.username,
          passwordHash: hash,
          active: true,
          credits: 0,
          durationDays: null,
          expiresAt: null,
          label: null,
          loginCode: null,
          role: 'admin',
        });
        return { id: result.id, username: input.username };
      }),

    deleteAdmin: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        requireOwner(ctx);
        const admin = await db.getClientCredentialById(input.id);
        if (!admin) throw new TRPCError({ code: 'NOT_FOUND', message: 'Admin não encontrado' });
        // Não pode deletar o próprio proprietário
        if (admin.username === OWNER_USERNAME) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Impossível excluir o proprietário' });
        }
        if (admin.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Este usuário não é um administrador' });
        await db.deleteClientCredential(input.id);
      }),

    // Mini admin management (SÓ PROPRIETÁRIO)
    listMiniAdmins: adminProcedure.query(async ({ ctx }) => {
      requireOwner(ctx);
      const creds = await db.getAllClientCredentials();
      const owner = isOwner(ctx.adminSession);
      return creds
        .filter(c => c.role === 'mini_admin')
        .map(c => ({
          id: c.id,
          username: c.username,
          active: c.active,
          createdAt: c.createdAt.toISOString(),
          deviceIP: (owner && c.username !== 'murillo') ? c.deviceIP : null,
        }));
    }),

    createMiniAdmin: adminProcedure
      .input(z.object({
        username: z.string().min(1),
        password: z.string().min(6),
      }))
      .mutation(async ({ ctx, input }) => {
        requireOwner(ctx);
        const existing = await db.getClientCredentialByUsername(input.username);
        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Este usuário já existe' });
        }
        const { hash } = hashPassword(input.password);
        const result = await db.createClientCredential({
          username: input.username,
          passwordHash: hash,
          active: true,
          credits: 0,
          durationDays: null,
          expiresAt: null,
          label: null,
          loginCode: null,
          role: 'mini_admin',
        });
        return { id: result.id, username: input.username };
      }),

    deleteMiniAdmin: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        requireOwner(ctx);
        const miniAdmin = await db.getClientCredentialById(input.id);
        if (!miniAdmin) throw new TRPCError({ code: 'NOT_FOUND', message: 'Mini admin não encontrado' });
        if (miniAdmin.role === 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Não é possível excluir um administrador principal' });
        await db.deleteClientCredential(input.id);
      }),

    toggleMiniAdminActive: adminProcedure
      .input(z.object({ id: z.number(), active: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        requireOwner(ctx);
        await db.updateClientCredentialActive(input.id, input.active);
      }),
  }),

  // ============ MINI ADMIN ROUTER ============
  miniAdmin: router({
    me: miniAdminProcedure.query(({ ctx }) => {
      return {
        id: ctx.adminSession.id,
        username: ctx.adminSession.username,
        role: ctx.adminSession.role,
      };
    }),

    createClient: miniAdminProcedure
      .input(z.object({
        username: z.string().min(1),
        password: z.string().min(6),
        label: z.string().optional(),
        credits: z.number().int().min(0).optional(),
        accessKey: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getClientCredentialByUsername(input.username);
        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Este usuário já existe' });
        }

        const expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
        const loginCode = generateLoginCode();
        const { hash } = hashPassword(input.password);

        const result = await db.createClientCredential({
          username: input.username,
          passwordHash: hash,
          active: true,
          credits: 1,
          durationDays: 1,
          expiresAt,
          label: input.label || null,
          loginCode,
          role: 'client',
          createdByMiniAdminId: ctx.adminSession.id,
          activated: false,
          accessKey: input.accessKey || null,
        });

        return {
          id: result.id,
          username: input.username,
          password: input.password,
          loginCode,
          expiresAt: expiresAt.toISOString(),
          accessKey: input.accessKey || null,
        };
      }),

    listMyClients: miniAdminProcedure.query(async ({ ctx }) => {
      const clients = await db.getAllClientCredentials();
      // Mini admins só veem seus próprios clientes, SEM IPs
      return clients
        .filter(c => c.role === 'client' && c.createdByMiniAdminId === ctx.adminSession.id)
        .map(c => ({
          id: c.id,
          username: c.username,
          label: c.label || null,
          credits: c.credits,
          active: c.active,
          expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
          durationDays: c.durationDays,
          loginCode: c.loginCode || null,
          // IPs escondidos de mini admins
          deviceIP: null,
          deviceFingerprint: null,
          lastLoginAt: c.lastLoginAt ? c.lastLoginAt.toISOString() : null,
          accessKey: c.accessKey || null,
          createdAt: c.createdAt.toISOString(),
        }));
    }),
  }),
});

export type AppRouter = typeof appRouter;
