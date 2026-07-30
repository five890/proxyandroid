import { hashPassword } from "./auth-utils.js";

// This script creates the default admin account if it doesn't exist
// Run: node server/seed-admin.mjs
// Or it will run automatically on first server start

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

async function seedAdmin() {
  try {
    const dotenv = await import("dotenv");
    dotenv.config();

    const mysql2 = await import("mysql2/promise");
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
      console.log("[Seed] No DATABASE_URL found, skipping admin seed.");
      return;
    }

    const [pool] = await mysql2.default.createConnection(dbUrl);

    // Check if admin already exists
    const [existing] = await pool.execute(
      "SELECT id FROM client_credentials WHERE username = ? AND role = 'admin'",
      [ADMIN_USERNAME]
    );

    if (existing.length > 0) {
      console.log("[Seed] Admin account already exists. Skipping.");
      await pool.end();
      return;
    }

    const { hash } = hashPassword(ADMIN_PASSWORD);

    await pool.execute(
      `INSERT INTO client_credentials (username, passwordHash, active, credits, role) VALUES (?, ?, true, 0, 'admin')`,
      [ADMIN_USERNAME, hash]
    );

    console.log("[Seed] Default admin account created successfully!");
    console.log(`[Seed] Username: ${ADMIN_USERNAME}`);
    console.log(`[Seed] Password: ${ADMIN_PASSWORD}`);
    console.log("[Seed] ⚠️  CHANGE THE PASSWORD IMMEDIATELY after first login!");

    await pool.end();
  } catch (error) {
    console.error("[Seed] Failed to create admin:", error.message);
  }
}

// Run auto-seed on module load
seedAdmin();
