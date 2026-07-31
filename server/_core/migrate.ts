import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import path from "path";

export async function runMigrations() {
  try {
    const { createConnection } = await import("mysql2/promise");
    const connection = await createConnection(process.env.DATABASE_URL || "");
    const db = drizzle(connection);

    console.log("[Migration] Running database migrations...");

    await migrate(db, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle"),
    });

    console.log("[Migration] Database migrations completed successfully.");
    await connection.end();
  } catch (err: any) {
    console.error("[Migration] Failed to run migrations:", err?.message || "Unknown error");
    console.warn("[Migration] The server will continue but database operations may fail.");
  }
}
