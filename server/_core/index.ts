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

async function createTables() {
  const mysql = await import("mysql2/promise");
  const connection = await mysql.createConnection(process.env.DATABASE_URL || "");

  console.log("[DB] Creating tables if not exist...");

  // users table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      openId VARCHAR(64) NOT NULL UNIQUE,
      name TEXT,
      email VARCHAR(320),
      loginMethod VARCHAR(64),
      role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);

  // client_credentials table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS client_credentials (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      passwordHash VARCHAR(256) NOT NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      credits INT NOT NULL DEFAULT 0,
      durationDays INT,
      expiresAt TIMESTAMP NULL,
      deviceFingerprint VARCHAR(512),
      deviceIP VARCHAR(64),
      deviceLockedAt TIMESTAMP NULL,
      label TEXT,
      loginCode VARCHAR(32),
      role ENUM('client', 'admin', 'mini_admin') NOT NULL DEFAULT 'client',
      createdByMiniAdminId INT,
      createdByAdmin VARCHAR(100),
      activated TINYINT(1) NOT NULL DEFAULT 0,
      accessKey TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      lastLoginAt TIMESTAMP NULL,
      generationLimit INT NOT NULL DEFAULT 0,
      generationsUsed INT NOT NULL DEFAULT 0,
      accessType ENUM('proxy_ios', 'proxy_android') NOT NULL DEFAULT 'proxy_ios',
      deviceType VARCHAR(32),
      loginLimit INT NOT NULL DEFAULT 1
    )
  `);

  // Alter table to add new columns if they don't exist
  try {
    await connection.query(`ALTER TABLE client_credentials ADD COLUMN generationLimit INT NOT NULL DEFAULT 0`);
    console.log("[DB] Added generationLimit column");
  } catch (e: any) {
    if (e.code !== 'ER_DUP_FIELDNAME') console.log("[DB] generationLimit already exists");
  }
  try {
    await connection.query(`ALTER TABLE client_credentials ADD COLUMN generationsUsed INT NOT NULL DEFAULT 0`);
    console.log("[DB] Added generationsUsed column");
  } catch (e: any) {
    if (e.code !== 'ER_DUP_FIELDNAME') console.log("[DB] generationsUsed already exists");
  }
  try {
    await connection.query(`ALTER TABLE client_credentials ADD COLUMN createdByAdmin VARCHAR(100)`);
    console.log("[DB] Added createdByAdmin column");
  } catch (e: any) {
    if (e.code !== 'ER_DUP_FIELDNAME') console.log("[DB] createdByAdmin already exists");
  }
  try {
    await connection.query(`ALTER TABLE client_credentials ADD COLUMN accessType ENUM('proxy_ios', 'proxy_android') NOT NULL DEFAULT 'proxy_ios'`);
    console.log("[DB] Added accessType column");
  } catch (e: any) {
    if (e.code !== 'ER_DUP_FIELDNAME') console.log("[DB] accessType already exists");
  }

  try {
    await connection.query(`ALTER TABLE client_credentials ADD COLUMN deviceType VARCHAR(32)`);
    console.log("[DB] Added deviceType column");
  } catch (e: any) {
    if (e.code !== 'ER_DUP_FIELDNAME') console.log("[DB] deviceType already exists");
  }

  try {
    await connection.query(`ALTER TABLE client_credentials ADD COLUMN loginLimit INT NOT NULL DEFAULT 1`);
    console.log("[DB] Added loginLimit column");
  } catch (e: any) {
    if (e.code !== 'ER_DUP_FIELDNAME') console.log("[DB] loginLimit already exists");
  }

  // active_sessions table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS active_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      credentialId INT NOT NULL,
      deviceFingerprint VARCHAR(512) NOT NULL,
      deviceIP VARCHAR(64),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      INDEX(credentialId)
    )
  `);
  console.log("[DB] active_sessions table ready");

  // files table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS files (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(256) NOT NULL,
      originalName VARCHAR(256) NOT NULL,
      s3Key VARCHAR(512) NOT NULL,
      s3Url TEXT NOT NULL,
      fileSize BIGINT,
      mimeType VARCHAR(128),
      uploadAdminId INT,
      description TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
    )
  `);

  // download_history table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS download_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      credentialId INT NOT NULL,
      fileId INT NOT NULL,
      downloadedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      ip VARCHAR(64)
    )
  `);

  // credit_transactions table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      credentialId INT NOT NULL,
      amount INT NOT NULL,
      reason TEXT,
      adminUserId INT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);

  // site_settings table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      \`key\` VARCHAR(100) NOT NULL UNIQUE,
      value TEXT,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
    )
  `);

  console.log("[DB] All tables created successfully.");
  await connection.end();
}

async function seedDefaultAdmin() {
  try {
    const mysql = await import("mysql2/promise");
    const connection = await mysql.createConnection(process.env.DATABASE_URL || "");

    // Import auth-utils dynamically (ESM)
    const { hashPassword } = await import("../auth-utils");

    const OWNER_USERNAME = "murillo";
    const OWNER_PASSWORD = "3005";

    // Check if owner 'murillo' exists
    const [existingOwner] = await connection.query(
      "SELECT id FROM client_credentials WHERE username = ? AND role = 'admin' LIMIT 1",
      [OWNER_USERNAME]
    );

    if ((existingOwner as any[]).length === 0) {
      // Create the owner admin
      const { hash } = hashPassword(OWNER_PASSWORD);
      await connection.query(
        `INSERT INTO client_credentials (username, passwordHash, active, credits, role) VALUES (?, ?, true, 999, 'admin')`,
        [OWNER_USERNAME, hash]
      );
      console.log(`[Seed] Owner created: ${OWNER_USERNAME} / ${OWNER_PASSWORD}`);
    } else {
      // Ensure owner password is correct (in case it was changed)
      const { hash } = hashPassword(OWNER_PASSWORD);
      await connection.query(
        "UPDATE client_credentials SET passwordHash = ?, active = 1 WHERE username = ? AND role = 'admin'",
        [hash, OWNER_USERNAME]
      );
      console.log(`[Seed] Owner '${OWNER_USERNAME}' exists, password updated.`);
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
  // Emergency admin setup endpoint - creates murillo/3005 directly in DB
  app.post("/api/setup-owner", async (req, res) => {
    try {
      const { hashPassword } = await import("../auth-utils");
      const mysql = await import("mysql2/promise");
      const connection = await mysql.createConnection(process.env.DATABASE_URL || "");
      
      // Check if murillo exists
      const [rows] = await connection.query(
        "SELECT id FROM client_credentials WHERE username = 'murillo' AND role = 'admin'"
      );
      
      if ((rows as any[]).length === 0) {
        const { hash } = hashPassword("3005");
        await connection.query(
          `INSERT INTO client_credentials (username, passwordHash, active, credits, role) VALUES ('murillo', ?, true, 999, 'admin')`,
          [hash]
        );
        res.json({ success: true, message: "Admin murillo criado com sucesso" });
      } else {
        // Update password to 3005
        const { hash } = hashPassword("3005");
        await connection.query(
          "UPDATE client_credentials SET passwordHash = ?, active = 1 WHERE username = 'murillo' AND role = 'admin'",
          [hash]
        );
        res.json({ success: true, message: "Senha do murillo atualizada para 3005" });
      }
      
      await connection.end();
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Emergency database reset endpoint - DANGER: This will delete all client credentials
  app.post("/api/reset-db", async (req, res) => {
    try {
      const mysql = await import("mysql2/promise");
      const connection = await mysql.createConnection(process.env.DATABASE_URL || "");
      
      // Delete all client credentials
      await connection.query("DELETE FROM client_credentials WHERE username != 'murillo' OR role != 'admin'");
      
      // Delete all active sessions
      await connection.query("DELETE FROM active_sessions");
      
      // Delete all credit transactions
      await connection.query("DELETE FROM credit_transactions");
      
      res.json({ success: true, message: "Database reset complete. Only owner account remains." });
      
      await connection.end();
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

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

createTables()
  .then(() => seedDefaultAdmin())
  .then(() => startServer())
  .catch(console.error);
