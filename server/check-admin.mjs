import "dotenv/config";
import mysql from "mysql2/promise";

// Generate hash for "admin123"
import { createHash, randomBytes } from 'crypto';

function hashPassword(password) {
  const salt = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(salt + password).digest('hex');
  return `${salt}:${hash}`;
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Check current admin
const [rows] = await connection.query("SELECT id, username, passwordHash FROM client_credentials WHERE username = 'admin' AND role = 'admin'");
console.log("Current admin rows:", JSON.stringify(rows, null, 2));

if (rows.length > 0) {
  // Generate new hash
  const newHash = hashPassword("admin123");
  console.log("New hash generated:", newHash);
  
  // Update the admin password
  await connection.query("UPDATE client_credentials SET passwordHash = ? WHERE username = 'admin' AND role = 'admin'", [newHash]);
  console.log("Admin password updated to: admin123");
} else {
  console.log("No admin found. Creating...");
  const newHash = hashPassword("admin123");
  await connection.query(
    "INSERT INTO client_credentials (username, passwordHash, active, credits, role) VALUES (?, ?, true, 0, 'admin')",
    ["admin", newHash]
  );
  console.log("Admin created with password: admin123");
}

await connection.end();
console.log("Done!");
