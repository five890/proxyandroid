import "dotenv/config";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await connection.query("SELECT id, username, role, active, LENGTH(passwordHash) as hashLen FROM client_credentials WHERE username = 'admin'");
console.log("Admin records:", JSON.stringify(rows));
await connection.end();
