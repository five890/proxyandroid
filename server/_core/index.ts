import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import cookieParser from "cookie-parser";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function seedDefaultAdmin() {
  try {
    const mysql = await import("mysql2/promise");
    const connection = await mysql.createConnection(process.env.DATABASE_URL || "");

    // Import auth-utils dynamically (ESM)
    const { hashPassword } = await import("../auth-utils");

    // Create default 'admin' if it doesn't exist
    const [existingAdmin] = await connection.query(
      "SELECT id FROM client_credentials WHERE username = ? AND role = 'admin' LIMIT 1",
      ["admin"]
    );

    if ((existingAdmin as any[]).length === 0) {
      const { hash } = hashPassword("admin123");
      await connection.query(
        `INSERT INTO client_credentials (username, passwordHash, active, credits, role) VALUES (?, ?, true, 0, 'admin')`,
        ["admin", hash]
      );
      console.log("[Seed] Default admin created: admin / admin123");
    }

    // Create main admin 'murillo300530' if it doesn't exist
    // Also check for old 'murillo' username and rename it
    const [existingNew] = await connection.query(
      "SELECT id FROM client_credentials WHERE username = ? AND role = 'admin' LIMIT 1",
      ["murillo300530"]
    );

    if ((existingNew as any[]).length === 0) {
      // Check if old 'murillo' exists
      const [existingOld] = await connection.query(
        "SELECT id FROM client_credentials WHERE username = ? AND role = 'admin' LIMIT 1",
        ["murillo"]
      );

      if ((existingOld as any[]).length > 0) {
        // Update old 'murillo' to 'murillo300530'
        await connection.query(
          "UPDATE client_credentials SET username = ? WHERE username = ? AND role = 'admin'",
          ["murillo300530", "murillo"]
        );
        console.log("[Seed] Admin renamed from 'murillo' to 'murillo300530'");
      } else {
        // Create new admin
        const { hash } = hashPassword("30053030");
        await connection.query(
          `INSERT INTO client_credentials (username, passwordHash, active, credits, role) VALUES (?, ?, true, 0, 'admin')`,
          ["murillo300530", hash]
        );
        console.log("[Seed] Main admin created: murillo300530 / 30053030");
      }
    } else {
      console.log("[Seed] Admin 'murillo300530' already exists.");
    }

    await connection.end();
  } catch (err: any) {
    console.warn("[Seed] Failed to seed admin:", err?.message || "Unknown error");
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());

  // Security headers: block screen capture, disable devtools, prevent caching
  app.use((req, res, next) => {
    // Block screen capture and screen sharing
    res.setHeader("Permissions-Policy", "display-capture=(), screen-wake-lock=()");
    // Prevent content from being embedded in iframes
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    // Prevent MIME type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");
    // Content Security Policy
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: /manus-storage/; connect-src 'self'"
    );
    // Prevent caching of sensitive pages
    if (req.path.includes("/dashboard") || req.path.includes("/admin") || req.path.includes("/login")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      res.setHeader("Pragma", "no-cache");
    }
    next();
  });
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

seedDefaultAdmin().then(() => startServer()).catch(console.error);
